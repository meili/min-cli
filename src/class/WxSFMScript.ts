import * as path from 'path'
import * as fs from 'fs'
import * as _ from 'lodash'
import * as changeCase from 'change-case'
import * as babel from 'babel-core'
import * as traverse from 'babel-traverse'
import { Depend, Request, WxSFM } from '../class'
import { RequestType, CompileType } from '../declare'
import util, { config, log, LogType, md, Global } from '../util'

import t = babel.types
import NodePath = traverse.NodePath

const CONFIG_KEY = 'config'
const DATA_KEY = 'data'
const PATH_SEP = path.sep

export namespace WxSFMScript {

  /**
   * 选项
   *
   * @export
   * @interface Options
   */
  export interface Options {

    /**
     * 编译类型
     *
     * @type {CompileType}
     * @memberof Options
     */
    compileType?: CompileType
  }

  /**
   * config 配置，script中的一部分，与.json文件一样 （组件、页面、应用）
   *
   * @export
   * @interface Config
   */
  export interface Config {
    component?: boolean
    usingComponents?: UsingComponents,
    [name: string]: any
  }

  /**
   * 引用wxc组件集合
   *
   * @export
   * @interface UsingComponents
   */
  export interface UsingComponents {
    [key: string]: string
  }
}

/**
 * SCRIPT 模块类
 *
 * @export
 * @class WxSFMScript
 * @extends {WxSFM}
 */
export class WxSFMScript extends WxSFM {
  /**
   * AST 语法树
   */
  private node: t.Node

  /**
   * 是否包含 export default
   *
   * @type {boolean}
   * @memberof WxSFMScript
   */
  // private hasExportDefault: boolean

  /**
   * config 配置
   *
   * @type {WxSFMScript.Config}
   * @memberof WxSFMScript
   */
  private config: WxSFMScript.Config = Object.create(null)

  /**
   * 依赖列表
   *
   * @private
   * @type {Depend[]}
   * @memberof WxSFMScript
   */
  private depends: Depend[] = []

  /**
   * Creates an instance of WxSFMScript.
   * @param {string} source
   * @param {Request} request
   * @param {CompileType} compileType
   * @memberof WxSFMScript
   */
  constructor (source: string, request: Request, public options: WxSFMScript.Options) {
    super(source, request, {
      destExt: request.ext === config.ext.wxs ? config.ext.wxs : config.ext.js
    })

    if (this.isWxp) { // 继承 app 全局的模板组件
      this.config = _.merge({}, this.config, {
        usingComponents: Global.layout.app.usingComponents
      })

      this.addWXCDepends(this.config.usingComponents)
    }

    this.initNode()
    this.traverse()
  }

  /**
   * 返回 wxa wxp wxa 单文件中 script 模块的 config 属性
   *
   * @returns
   * @memberof WxSFMScript
   */
  getConfig () {
    return this.config
  }

  /**
   * 返回 wxa wxp wxa 单文件中 script 模块所引用的 wxc 组件
   *
   * @returns
   * @memberof WxSFMScript
   */
  getUsingComponents () {
    return this.config.usingComponents || {}
  }

  /**
   * 获取依赖列表
   *
   * @returns {Depend[]}
   * @memberof WxSFMScript
   */
  getDepends (): Depend[] {
    return this.depends
  }

  /**
   * 更新依赖列表
   *
   * @param {Request.Core[]} useRequests 可用的请求列表
   * @memberof WxSFMScript
   */
  updateDepends (useRequests: Request.Core[]): void {
    let depends = this.getDepends()

    useRequests.forEach(useRequest => {

      depends
      .filter(depend => {
        return depend.requestType === useRequest.requestType && depend.request === useRequest.request
      })
      .forEach(depend => {
        let request = ''
        request = path.relative(path.dirname(this.dest), path.dirname(useRequest.dest))
        request = path.join(request, path.basename(useRequest.dest, useRequest.ext))
        request = request.charAt(0) !== '.' ? `./${request}` : request
        request = request.split(path.sep).join('/')

        switch (depend.requestType) {
          case RequestType.SCRIPT:
            depend.$node.value = request + config.ext.js
            break

          case RequestType.JSON:
            // *.json => *.json.js
            depend.$node.value = request + useRequest.ext + config.ext.js
            break

          case RequestType.WXS:
            if (depend.$node) {
              depend.$node.value = request + useRequest.ext
            }
            break

          case RequestType.WXC:
          case RequestType.WXP:
            this.config.usingComponents = Object.assign(this.config.usingComponents || {}, {
              [depend.usingKey]: request
            })
            break
        }
      })
    })
  }

  /**
   * 将 AST 节点树生成 code 代码
   *
   * @returns {string}
   * @memberof WxSFMScript
   */
  generator (): string {
    let { isThreeNpm, ext } = this.request

    // for @mindev/min-compiler-babel
    // 第三方NPM包，不使用babel编译
    let transformOptions = isThreeNpm ? {} : (config.compilers['babel'] || {})

    // TODO BUG
    // wxs文件 或者 build编译情况下，关闭sourceMaps
    if (ext === config.ext.wxs) {
      transformOptions = _.omit(transformOptions, 'sourceMaps')
    }

    let result;
    // 调试模式下代码转译时容错, 避免保存代码时有语法问题导致构建进程出错退出
    if (Global.isDev) {
      try {
        result = babel.transformFromAst(this.node, this.source, {
          ast: false,
          babelrc: false,
          filename: this.request.src,
          ...transformOptions
        })
      } catch (error) {
        log.error(`babel.transformFromAst error: ${error}`)
        console.error(error)
      }
    } else {
      result = babel.transformFromAst(this.node, this.source, {
        ast: false,
        babelrc: false,
        filename: this.request.src,
        ...transformOptions
      })
    }
    let { code = '' } = result ? result : {}
    return code
  }

  /**
   * 保存文件
   *
   * @memberof WxSFMScript
   */
  save () {
    super.save()
  }

  /**
   * 移除文件
   *
   * @memberof WxSFMScript
   */
  remove () {
    super.remove()
  }

  /**
   * 保存文件后的处理函数
   *
   * @memberof WxSFMScript
   */
  afterSave (): void {
    this.saveConfigFile()
  }

  /**
   * 初始化 AST 节点树
   *
   * @private
   * @memberof WxSFMScript
   */
  private initNode () {
    // 调试模式下代码转译时容错, 避免保存代码时有语法问题导致构建进程出错退出
    if (Global.isDev) {
      try {
        this.transformSource();
      } catch (error) {
        log.error(`babel.transform error: ${error}`)
        console.error(error)
      }
    } else {
      this.transformSource();
    }
  }

  /**
   * 根据源码生成 AST 节点树
   * 
   * @private
   * @memberof WxSFMScript
   */
  private transformSource () {
    let result = babel.transform(this.source, {
      ast: true,
      babelrc: false
    })

    let { ast = t.emptyStatement() } = result
    this.node = ast
  }

  /**
   * AST 节点树转换器
   *
   * @private
   * @memberof WxSFMScript
   */
  private traverse () {
    let visitor: babel.Visitor = {
      // import hello from './hello
      ImportDeclaration: (path) => {
        this.visitDepend(path)
      },
      CallExpression: (path) => {
        this.visitDepend(path)
      },
      ExportDefaultDeclaration: (path) => {
        // this.hasExportDefault = true
      },
      ObjectExpression: (path) => {
        this.visitStructure(path)
      },
      ObjectProperty: (path) => {
        this.visitMarkdown(path)
        this.visitConfig(path)
      }
    }
    babel.traverse(this.node, visitor)
  }

  private checkUseModuleExports (path: NodePath<t.ObjectExpression>): boolean | undefined {
    if (!this.isSFC) {
      return
    }

    // the parent is module.exports = {}; exports.default = {}
    if (!t.isAssignmentExpression(path.parent)) {
      return
    }

    let { left, operator } = path.parent

    if (operator !== '=') {
      return
    }

    // left => module.exports or exports.default
    // operator => =
    // right => { ... }
    if (!t.isMemberExpression(left)) {
      return
    }

    if (!t.isIdentifier(left.object) || !t.isIdentifier(left.property)) {
      return
    }

    let expression = `${left.object.name}.${left.property.name}`
    if (expression !== 'module.exports' && expression !== 'exports.default') {
      return
    }

    return true
  }

  /**
   * babel.traverse 转换访问器方法，用于在 export default 增加一个构造函数
   *
   * @private
   * @param {NodePath<t.ObjectExpression>} path 节点路径
   * @memberof WxSFMScript
   */
  private checkUseExportDefault (path: NodePath<t.ObjectExpression>): boolean | undefined {
    if (!this.isSFC) {
      return
    }

    // the parent is export default
    if (!t.isExportDefaultDeclaration(path.parent)) {
      return
    }

    return true
  }

  private visitStructure (path: NodePath<t.ObjectExpression>) {
    // export default {...} => export default Component({...})
    // export default {...} => export default Page({...})
    // export default {...} => export default App({...})

    // module.exports = {...} => export default App({...})

    if (!this.checkUseExportDefault(path) && !this.checkUseModuleExports(path)) {
      return
    }

    // .wxc => wxc => Component
    // .wxp => wxc => Page
    // .wxa => wxa => App
    let extKey = _.findKey(config.ext, (ext) => ext === this.request.ext) || ''
    let structure = config.structure[extKey]
    if (!structure) {
      log.error('没找到构造器')
      return
    }
    path.replaceWith(t.callExpression(
      t.identifier(structure),
      [t.objectExpression(path.node.properties)]
    ))
  }

  /**
   * babel.traverse 转换访问器方法，用于将 docs 和 demos 目录下文件md内容转换成 html 并写入到 data 属性 中
   *
   * @private
   * @param {NodePath<t.ObjectProperty>} path 节点路径
   * @memberof WxSFMScript
   */
  private visitMarkdown (path: NodePath<t.ObjectProperty>) {
    if (!this.isWxp) {
      return
    }

    let { key, value } = path.node
    let dataKey = ''
    if (t.isIdentifier(key)) {
      dataKey = key.name
    } else if (t.isStringLiteral(key)) {
      dataKey = key.value
    }

    if (DATA_KEY !== dataKey) {
      return
    }

    if (!value) {
      log.warn('data 属性没有值')
      return
    }
    if (!t.isObjectExpression(value)) {
      log.warn('data 属性不是一个ObjectExpression')
      return
    }

    let properties: Array<t.ObjectProperty> = []
    // [['src', 'pages'], ['abnor', 'index.wxp']] => ['src', 'pages', 'abnor', 'index.wxp'] => 'src\/pages\/abnor\/index.wxp'
    let pattern = Array.prototype.concat.apply([], [config.pages.split('/'), ['([a-z-]+)', `index${config.ext.wxp}`]]).join(`\\${PATH_SEP}`)

    // src/pages/abnor/index.wxp => ['src/pages/abnor/index.wxp', 'abnor']
    let matchs = this.request.srcRelative.match(new RegExp(`^${pattern}$`))
    if (!matchs || matchs.length < 2) {
      return
    }

    // abnor => wxc-abnor
    let pkgDirName = `${config.prefixStr}${matchs[1]}`
    // ~/you_project_path/src/packages/wxc-abnor/README.md
    let readmeFile = config.getPath('packages', pkgDirName, 'README.md')

    properties.push(
      t.objectProperty(
        t.identifier('readme'), // readme
        t.stringLiteral(this.md2htmlFromFile(readmeFile))
      )
    )

    // let docIntroFile = 'docs/intro.md'
    // let docApiFile = 'docs/api.md'
    // let docChangeLogFile = 'docs/changelog.md'

    // properties.push(
    //   t.objectProperty(
    //     t.identifier('docIntro'), // docIntro
    //     t.stringLiteral(this.md2htmlFromFile(docIntroFile)) // <h1></h1>
    //   )
    // )
    // properties.push(
    //   t.objectProperty(
    //     t.identifier('docApi'), // docApi
    //     t.stringLiteral(this.md2htmlFromFile(docApiFile))
    //   )
    // )
    // properties.push(
    //   t.objectProperty(
    //     t.identifier('docChangeLog'), // docChangeLog
    //     t.stringLiteral(this.md2htmlFromFile(docChangeLogFile))
    //   )
    // )

    // 前提条件，需要将config字段写在js模块最前面
    let dependWxcs = this.depends.filter(depend => {
      return depend.requestType === RequestType.WXC && /^demo-/.test(depend.usingKey)
    })

    _.forEach(dependWxcs, (dependWxc: Depend.Wxc, index) => {
      let name = dependWxc.usingKey
      let file = `${dependWxc.request}${config.ext.wxc}`
      properties.push(
        t.objectProperty(
          t.identifier(changeCase.camelCase(name)), // demoDefault
          t.stringLiteral(this.md2htmlFromFile(file)) // <template><wxc-hello></wxc-hello><template>
        )
      )
    })

    let mdObjectProperty = t.objectProperty(
      t.stringLiteral('__code__'),
      t.objectExpression(properties)
    )

    value.properties = [mdObjectProperty, ...value.properties]
  }

  /**
   * babel.traverse 转换访问器方法，用于将import 或 require 依赖的路径提取到 this.depends 中
   *
   * @private
   * @param {(NodePath<t.ImportDeclaration | t.CallExpression>)} path 节点路径
   * @memberof WxSFMScript
   */
  private visitDepend (path: NodePath<t.ImportDeclaration | t.CallExpression>) {
    if (t.isImportDeclaration(path.node)) { // import
      let { source: $node } = path.node
      this.addNativeDepends($node)
    } else if (t.isCallExpression(path.node)) { // require
      let { callee, arguments: args } = path.node
      if (!(t.isIdentifier(callee) && callee.name === 'require' && args.length > 0)) {
        return
      }

      let $node = args[0]
      if (t.isStringLiteral($node)) {
        this.addNativeDepends($node)
      }
    }
  }

  /**
   * babel.traverse 转换访问器方法，用于设置 this.config 配置对象
   *
   * @private
   * @param {NodePath<t.ObjectProperty>} path
   * @memberof WxSFMScript
   */
  private visitConfig (path: NodePath<t.ObjectProperty>) {
    if (!this.isSFC) {
      return
    }

    let config = this.transfromConfig(path.node)

    if (!config) {
      return
    }

    this.config = _.merge({}, this.config, config)

    this.addWXCDepends(this.config.usingComponents)

    path.remove()

    // value.properties.forEach(prop => {
    //   // key   => 'navigationBarTitleText'
    //   // value => 'Title'
    //   if (!t.isObjectProperty(prop))
    //     return

    //   let key = ''
    //   if (t.isStringLiteral(prop.key)) { // 'navigationBarTitleText' || 'usingComponents'
    //     key = prop.key.value
    //   } else if (t.isIdentifier(prop.key)) { // navigationBarTitleText || usingComponents
    //     key = prop.key.name
    //   }

    //   if (!key)
    //     return

    //   this.setConfigUsing(key, prop.value)
    //   this.setConfigProp(key, prop.value)
    // })
    // path.remove()
  }

  /**
   * 添加WXC依赖
   *
   * @private
   * @param {WxSFMScript.UsingComponents} [usingComponents]
   * @memberof WxSFMScript
   */
  private addWXCDepends (usingComponents?: WxSFMScript.UsingComponents) {
    if (!usingComponents) {
      return
    }

    if (this.isWxc || this.isWxp) { // 组件 & 页面
      _.forIn(usingComponents, (value, key) => {
        this.depends.push({ // 'wxc-loading' => '@scope/wxc-loading'
          request: value,
          requestType: RequestType.WXC,
          usingKey: key
        })
      })
    }
  }

  private addNativeDepends ($node: t.StringLiteral) {
    let request = $node.value
    let isJsonExt = path.extname(request) === config.ext.json
    let isWxsExt = path.extname(request) === config.ext.wxs

    if (isJsonExt) {
      this.depends.push({
        request,
        requestType: RequestType.JSON,
        $node
      })
    } else if (isWxsExt) {
      this.depends.push({
        request,
        requestType: RequestType.WXS,
        $node
      })
    } else {
      this.depends.push({
        request,
        requestType: RequestType.SCRIPT,
        $node
      })
    }
  }

  /**
   * 将文件的MD内容转换成HTML
   *
   * @private
   * @param {string} file 文件地址
   * @returns
   * @memberof WxSFMScript
   */
  private md2htmlFromFile (file: string) {
    if (!path.isAbsolute(file)) {
      file = path.join(path.dirname(this.request.src), file)
    }
    if (fs.existsSync(file)) {
      let source = fs.readFileSync(file, 'utf-8')
      let isWxc = path.extname(file) === config.ext.wxc
      if (isWxc) {
        source = '``` html\n' + source + '\n```'
      }
      return `${md.md2html(source, isWxc)}`
    }
    return ''
  }

  /**
   * 将 AST节点 转换成 config 配置对象
   *
   * @private
   * @param {t.Node} node AST节点
   * @returns {(WxSFMScript.Config | undefined)}
   * @memberof WxSFMScript
   */
  private transfromConfig (node: t.Node): WxSFMScript.Config | undefined {
    if (!t.isObjectProperty(node)) {
      return
    }

    let { key, value } = node
    let configKey = ''

    if (t.isIdentifier(key)) { // {config: {key, value}}
      configKey = key.name
    } else if (t.isStringLiteral(key)) { // {'config': {key, value}}
      configKey = key.value
    }

    if (CONFIG_KEY !== configKey) {
      return
    }

    if (!value) {
      return
    }

    if (!t.isObjectExpression(value)) {
      log.warn('config 属性不是一个ObjectExpression')
      return
    }

    let config: WxSFMScript.Config = {}
    let configProgram = t.program([
      t.expressionStatement(
        t.assignmentExpression('=', t.identifier('config'), value) // config = value
      )
    ])

    let { code: configCode = '' } = babel.transformFromAst(configProgram, '', {
      code: true,
      ast: false,
      babelrc: false
    })

    // run code
    eval(configCode)

    config = config || {}
    config.usingComponents = config.usingComponents || {}

    return config
  }

  /**
   * 将 wxp wxa 单文件中 script 模块的 config 属性值提取并过滤 并保存到 file.json 中
   *
   * @private
   * @memberof WxSFMScript
   */
  private saveConfigFile () {
    if (!this.isWxp && !this.isWxc) {
      return
    }

    let configCopy = _.cloneDeep(this.config)

    if (this.isWxc) {
      configCopy.component = true
    }

    // save config
    let dester = this.getDester(config.ext.json)
    log.msg(LogType.WRITE, dester.destRelative)
    util.writeFile(dester.dest, JSON.stringify(configCopy, null, 2))
  }
}

// 设置 config 的 usingComponents 的属性
  // private setConfigUsing (propKey: string, propValue: t.Expression) {
  //   if (propKey !== USING_KEY)
  //     return

  //   if (!this.isWxc && !this.isWxp)
  //     return

  //   if (!t.isObjectExpression(propValue)) {
  //     log.warn('config.usingComponents 属性不是一个ObjectExpression')
  //     return
  //   }

  //   // {'value': {'properties': [{'wx-loading': '@scope/wxc-loading'}]}}
  //   propValue.properties.forEach(prop => {
  //     // key   => 'wxc-loading'
  //     // value => '@scope/wxc-loading'
  //     if (!t.isObjectProperty(prop))
  //       return

  //     let key = ''
  //     let value = ''
  //     if (t.isStringLiteral(prop.key)) { // 'wxc-loading'
  //       key = prop.key.value
  //     } else if (t.isIdentifier(prop.key)) { // loading
  //       key = prop.key.name
  //     }

  //     if (t.isStringLiteral(prop.value)) { // '@scope/wxc-loading'
  //       value = prop.value.value
  //     }

  //     if (!key || !value)
  //       return

  //     this.config.usingComponents = this.config.usingComponents || {}
  //     // key   => 'wxc-loading'
  //     // value => '@scope/wxc-loading'
  //     this.config.usingComponents[key] = value

  //     // 'wxc-loading' => '@scope/wxc-loading'
  //     this.depends.push({
  //       request: value,
  //       requestType: RequestType.WXC,
  //       usingKey: key
  //     })
  //   })
  // }

  // 设置 config 的属性
  // private setConfigProp (propKey: string, propValue: t.Expression) {
  //   if (propKey === USING_KEY)
  //     return

  //   let key = propKey
  //   let value: string | boolean | undefined = undefined
  //   if (t.isStringLiteral(propValue)) { // 'Title'
  //     value = propValue.value
  //   } else if (t.isIdentifier(propValue)) { // 100
  //     value = propValue.name
  //   } else if (t.isBooleanLiteral(propValue)) { // true
  //     value = propValue.value
  //   }
  //   if (_.isUndefined(value))
  //     return

  //   this.config[key] = value
  // }
