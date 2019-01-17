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

const GLOBAL_MIN_KEY = 'globalMin'
const CONFIG_KEY = 'config'
const MIXINS_KEY = 'mixins'
const DATA_KEY = 'data'
const PATH_SEP = path.sep

let $path = path

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

  export interface GlobalMin {
    config: {
      usingComponents: UsingComponents
    },
    mixins: string[],
    requestDeclaration: (t.ImportDeclaration | t.VariableDeclarator)[]
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

  private globalMin: WxSFMScript.GlobalMin = {
    config: {
      usingComponents: {}
    },
    mixins: [],
    requestDeclaration: []
  }

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

    this.initConfig()
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
    let { usingComponents = {} } = this.config
    return usingComponents
  }

  getGlobalMin () {
    if (!this.isWxa) return

    let { config } = this.globalMin
    let { usingComponents = {} } = config
    let { usingComponents: usingComponents2 = {} } = this.config

    _.merge(usingComponents, _.cloneDeep(usingComponents2))

    return this.globalMin
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

    let result = babel.transformFromAst(this.node, this.source, {
      ast: false,
      babelrc: false,
      filename: this.request.src,
      ...transformOptions
    })
    let { code = '' } = result
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

  private initConfig () {
    if (!this.isWxp) return

    let { globalMin } = Global.layout.app
    let { config } = globalMin
    let { usingComponents } = config

    this.config = _.merge({}, this.config, {
      usingComponents
    })

    this.addWXCDepends(this.config.usingComponents)
  }

  /**
   * 初始化 AST 节点树
   *
   * @private
   * @memberof WxSFMScript
   */
  private initNode () {
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
      Program: (path) => {
        this.createMixinsDeclaration(path)
      },
      // import hello from './hello
      ImportDeclaration: (path) => {
        this.visitDepend(path)
      },
      CallExpression: (path) => {
        this.visitDepend(path)
        this.createMixinsProperties(path)
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
        this.visitGlobalMin(path)
      }
    }
    babel.traverse(this.node, visitor)
  }

  private checkUseModuleExports (path: NodePath<t.ObjectExpression>): boolean | undefined {
    if (!this.isSFC) {
      return undefined
    }

    // the parent is module.exports = {}; exports.default = {}
    if (!t.isAssignmentExpression(path.parent)) {
      return undefined
    }

    let { left, operator } = path.parent

    if (operator !== '=') {
      return undefined
    }

    // left => module.exports or exports.default
    // operator => =
    // right => { ... }
    if (!t.isMemberExpression(left)) {
      return undefined
    }

    if (!t.isIdentifier(left.object) || !t.isIdentifier(left.property)) {
      return undefined
    }

    let expression = `${left.object.name}.${left.property.name}`
    if (expression !== 'module.exports' && expression !== 'exports.default') {
      return undefined
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
      return undefined
    }

    // the parent is export default
    if (!t.isExportDefaultDeclaration(path.parent)) {
      return undefined
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
    // Extract import declaration
    let extractImport = (node: t.ImportDeclaration): Boolean => {
      let { source: $node } = node

      // Add a dependency.
      this.addNativeDepends($node)

      return true
    }

    // Extract require declaration
    let extractRequire = (node: t.CallExpression): Boolean => {
      let { callee, arguments: args } = node

      // It must be the require function, with parameters.
      if (!(t.isIdentifier(callee) && callee.name === 'require' && args.length > 0)) {
        return false
      }

      // For example, from the first parameter of require('xxx').
      let $node = args[0]

      // Must be a string type.
      if (!t.isStringLiteral($node)) return false

      // Add a dependency.
      this.addNativeDepends($node)

      return true
    }

    // Add request declaration
    let addRequestDeclaration = () => {
      let { requestDeclaration } = this.globalMin
      let { node, parent } = path
      let $node = null

      if (t.isImportDeclaration(node)) {
        $node = node
      }

      if (t.isCallExpression(node) && t.isVariableDeclarator(parent)) {
        $node = parent
      }

      if (!$node) return

      // Add a request declaration
      requestDeclaration.push($node)
    }

    let { node } = path

    // For import
    if (t.isImportDeclaration(node)) {
      let isContinue = extractImport(node)

      if (!isContinue) return

      // Add request declaration
      addRequestDeclaration()
      return
    }

    // For require
    if (t.isCallExpression(node)) {
      let isContinue = extractRequire(node)

      if (!isContinue) return

      // Add request declaration
      addRequestDeclaration()
      return
    }
  }

  /**
   * Create or attach the mixins properties.
   * For WXP
   *
   * @private
   * @param {NodePath<t.CallExpression>} path
   * @memberof WxSFMScript
   */
  private createMixinsProperties (path: NodePath<t.CallExpression>) {
    if (!this.isWxp) return

    let { node: { callee, arguments: args } } = path
    if (!t.isMemberExpression(callee)) return
    if (!args || args.length === 0) return

    // For Example：
    // object.name is min
    // property.name is Page
    let { object, property } = callee
    if (!t.isIdentifier(object) || !t.isIdentifier(property)) return

    let caller = `${object.name}.${property.name}`
    // The mixins function is valid only in min.Page.
    if (caller !== 'min.Page') return

    let arg = args[0]
    // The first argument must be the ObjectExpression.
    if (!t.isObjectExpression(arg)) return

    let { properties } = arg

    // Get the mixins properties.
    let prop = properties.find(prop => {
      if (!t.isObjectProperty(prop)) return false

      let keyField = getKeyOrValueFieldByExpression(prop.key)

      if (keyField === MIXINS_KEY) return true
    })

    let { mixins } = Global.layout.app.globalMin

    // Create an arrayExpression.
    // For example：[mixin1, mixin2]
    let arrExp = t.arrayExpression(mixins.map(mixin => {
      return t.identifier(mixin)
    }))

    // The mixins property already exists.
    if (prop && t.isObjectProperty(prop)) {
      let { value } = prop
      if (!t.isArrayExpression(value)) return

      // Extend the new value from the existing mixins attribute.
      // For example：[newMixin1, newMixin2, oldMixin1, oldMixin2]
      value.elements = [
        ...arrExp.elements,
        ...value.elements
      ]
    } else {
      // Create a mixins attribute.
      // For example：{mixins: [mixin1, mixin2]}
      prop = t.objectProperty(t.identifier(MIXINS_KEY), arrExp)
      properties.push(prop)
    }
  }

  /**
   * Create or attach the mixins declaration.
   * For WXP
   *
   * @private
   * @param {NodePath<t.Program>} path
   * @memberof WxSFMScript
   */
  private createMixinsDeclaration (path: NodePath<t.Program>) {
    if (!this.isWxp) return

    // For import Declaration
    // Example:
    // 1. import mixin from 'mixins/xxx'
    // 2. import { mixin1, mixin2 } from 'mixins/xxx'
    let importDecl = (mixin: string, decl: t.ImportDeclaration) => {

      // specifiers => [mixin, mixin1, mixin2]
      // source => mixins/xxx
      let { specifiers, source } = decl

      // Find a name that is the same as specifiers.
      let spe = specifiers.find(spe => {
        let { local: { name } } = spe
        return name === mixin
      })

      if (!spe) return

      let newSpecifiers = [spe]
      let newSource = resolvePath(source.value)
      let newImportDeclaration = t.importDeclaration(newSpecifiers, newSource)

      // Insert the top of the body.
      body.unshift(newImportDeclaration)
    }

    // For require Declaration
    // Example:
    // 1. const mixn = require('mixins/xxx')
    // 2. const { mixin1, mixin2 } = require('mixins/xxx')
    // 3. const { mixin2: mixin22 } = require('mixins/xxx')
    let requireDecl = (mixin: string, decl: t.VariableDeclarator) => {
      let { id, init } = decl

      if (!t.isCallExpression(init)) return
      if (!init.arguments.length) return

      // Get first argument，Ignore other arguments
      // For example: 'mixins/xxx'
      let fistArgument = init.arguments[0]

      if (!t.isStringLiteral(fistArgument)) return

      let newDeclarations = []

      // Get the resolved require path.
      // For example: ['~/mixins/xxx']
      let newArguments = [resolvePath(fistArgument.value)]
      // For example: require('~/mixns/xxx')
      let newInit = t.callExpression(init.callee, newArguments)

      // ①
      // For example:
      // id => { mixin1 }
      // id => { mixin2: mixin22 }
      if (t.isObjectPattern(id)) {
        let { properties } = id

        // Find a name that is the same a properties.
        let prop = properties.find(prop => {
          if (!t.isObjectProperty(prop)) return false

          // Get mixin22 from { mixin2: mixin22 }
          let valueField = getKeyOrValueFieldByExpression(prop.value)
          return valueField === mixin
        })

        if (!prop) return

        // Create an objectPattern
        let newId = t.objectPattern([prop])
        newDeclarations = [t.variableDeclarator(newId, newInit)]
      }

      // ②
      // For example:
      // id => mixin
      if (t.isIdentifier(id) && id.name === mixin) {
        // Use the original id
        let newId = id
        newDeclarations = [t.variableDeclarator(newId, newInit)]
      }

      if (newDeclarations.length === 0) return

      let newVariableDeclaration = t.variableDeclaration('const', newDeclarations)

      // Insert the top of the body.
      body.unshift(newVariableDeclaration)
    }

    // The require path of the mixins is resolved.
    let resolvePath = (requirePath: string): t.StringLiteral => {
      if (requirePath.charAt(0) === '.') {
        let { request: appRequest } = Global.layout.app
        let { src: appFilePath } = appRequest
        let { src: curFilePath } = this.request

        // The relative path from the current file to the app file.
        // For example:
        // from ~/src/pages/home/index.wxp
        // to   ~/src/app.wxa
        let relativePath = $path.relative($path.dirname(curFilePath), $path.dirname(appFilePath))

        // For example: ../../
        requirePath = $path.join(relativePath, requirePath)
      }
      return t.stringLiteral(requirePath)
    }

    let { node: { body } } = path

    let { globalMin } = Global.layout.app
    let { mixins, requestDeclaration } = globalMin

    mixins.forEach(mixin => {
      requestDeclaration.forEach(decl => {
        if (t.isImportDeclaration(decl)) {

          importDecl(mixin, decl)
        }

        if (t.isVariableDeclarator(decl)) {

          requireDecl(mixin, decl)
        }
      })
    })
  }

  /**
   * babel.traverse 转换访问器方法，用于设置 this.config 配置对象
   *
   * @private
   * @param {NodePath<t.ObjectProperty>} path
   * @memberof WxSFMScript
   */
  private visitConfig (path: NodePath<t.ObjectProperty>) {
    if (!this.isSFC) return

    let { node, parent } = path
    let $config = getConfigObjectByNode(node)

    if (!$config) return

    this.config = _.merge({}, this.config, $config)

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

  private visitGlobalMin (path: NodePath<t.ObjectProperty>) {
    let { node } = path

    if (!this.isWxa) return
    if (!node) return

    // Extract config from globalMix.
    let extractConfig = (prop: t.ObjectProperty) => {
      let $config = getConfigObjectByNode(prop)
      let { config } = this.globalMin

      // Merge the config properties to globalMin.
      _.merge(config, $config)
    }

    // Extract mixins from globalMix.
    let extractMixins = (prop: t.ObjectProperty) => {

      if (!t.isArrayExpression(prop.value)) {
        log.warn('mixins 属性不是一个 ArrayExpression 类型')
        return
      }

      // Register the list of elements for mixins.
      let { elements } = prop.value
      let { mixins } = this.globalMin

      let $mixins = elements.map(elem => {
        if (!t.isIdentifier(elem)) {
          log.warn(`mixins 中包含非 Identifier 类型的元素`)
          return
        }
        return elem.name
      }).filter(elem => !!elem)

      $mixins.forEach(mixin => mixins.push(mixin))
    }

    let { key, value } = node
    let keyField = getKeyOrValueFieldByExpression(key)

    if (GLOBAL_MIN_KEY !== keyField) {
      return undefined
    }

    if (!value || value.type !== 'ObjectExpression') {
      return undefined
    }

    // { config: {}, mixins: []}
    let { properties } = value

    properties.forEach(prop => {

      if (!t.isObjectProperty(prop)) return

      // Get the key field name from globalMix.
      let keyField = getKeyOrValueFieldByExpression(prop.key)

      switch (keyField) {
        case CONFIG_KEY:
          extractConfig(prop)
          break

        case MIXINS_KEY:
          extractMixins(prop)
          break
      }
    })

    _.merge(this.globalMin, {
      config: {
        usingComponents: {}
      },
      mixins: [],
      requestDeclaration: []
    })

    path.remove()
  }

  /**
   * 添加WXC依赖
   *
   * @private
   * @param {WxSFMScript.UsingComponents} [usingComponents]
   * @memberof WxSFMScript
   */
  private addWXCDepends (usingComponents?: WxSFMScript.UsingComponents) {
    if (!usingComponents) return

    if (this.isWxc || this.isWxp) { // 组件 & 页面

      // TODO There is duplication of dependency.

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
      let isVirtual = !!config.resolveVirtual[request]
      this.depends.push({
        request,
        requestType: RequestType.SCRIPT,
        $node,
        isVirtual
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
   * 将 wxp wxa 单文件中 script 模块的 config 属性值提取并过滤 并保存到 file.json 中
   *
   * @private
   * @memberof WxSFMScript
   */
  private saveConfigFile () {
    if (!this.isWxp && !this.isWxc) return

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

/**
 * Get key or value field name By t.Expression
 *
 * @param {t.Expression} keyOrValue
 * @returns {(string | undefined)}
 */
function getKeyOrValueFieldByExpression (keyOrValue: t.Expression): string | undefined {
  // Example {config: {key, value}}
  if (t.isIdentifier(keyOrValue)) {
    return keyOrValue.name
  }

  // Example {'config': {key, value}}
  if (t.isStringLiteral(keyOrValue)) {
    return keyOrValue.value
  }

  return ''
}

/**
 * Get the config object through the node of Babel.
 *
 * @private
 * @param {t.ObjectProperty} prop
 * @returns {(WxSFMScript.Config | undefined)}
 */
function getConfigObjectByNode (prop: t.ObjectProperty): WxSFMScript.Config | undefined {
  // if (!t.isObjectProperty(node)) {
  //   return undefined
  // }

  let { key, value } = prop
  let keyField = getKeyOrValueFieldByExpression(key)

  if (CONFIG_KEY !== keyField) {
    return undefined
  }

  if (!value) {
    return undefined
  }

  if (!t.isObjectExpression(value)) {
    log.warn('config 属性不是一个 ObjectExpression 类型')
    return undefined
  }

  let $config: WxSFMScript.Config = {}

  // Create ast
  let configProgram = t.program([
    t.expressionStatement(
      t.assignmentExpression('=', t.identifier('$config'), value) // config = value
    )
  ])

  let { code: configCode = '' } = babel.transformFromAst(configProgram, '', {
    code: true,
    ast: false,
    babelrc: false
  })

  // Execute the code and export a $config object.
  eval(configCode)

  return _.merge($config, {
    usingComponents: {}
  })
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
