import * as url from 'url'
import * as path from 'path'
import * as less from 'less'
import * as postcss from 'postcss'
import * as sass from 'node-sass'
import { Depend, Request, WxSFM } from '../class'
import { RequestType, CompileType } from '../declare'
import util, { config, Global, ICONFONT_PATTERN, log } from '../util'
import { postcssUnit2rpx } from '../plugin'

/* precss-start */
// const precss = require('precss')
// import 插件有wxc工具提供
// const postcssPartialImport = require('postcss-partial-import')
const postcssMixins = require('postcss-mixins')
const postcssAdvancedVariables = require('postcss-advanced-variables')
const postcssCustomMedia = require('postcss-custom-media')
const postcssCustomProperties = require('postcss-custom-properties')
const postcssMediaMinmax = require('postcss-media-minmax')
const postcssColorFunction = require('postcss-color-function')
const postcssNesting = require('postcss-nesting')
const postcssNested = require('postcss-nested')
const postcssCustomSelectors = require('postcss-custom-selectors')
const postcssAtroot = require('postcss-atroot')
const postcssPropertyLookup = require('postcss-property-lookup')
const postcssExtend = require('postcss-extend')
const postcssSelectorMatches = require('postcss-selector-matches')
const postcssSelectorNot = require('postcss-selector-not')
/* precss-end */

const postcssBem = require('postcss-bem')
const postcssCalc = require('postcss-calc')

// bem 选项
const postcssBemOptions = {
  defaultNamespace: undefined,
  style: 'suit',
  separators: {
    descendent: '__',
    modifier: '--'
  },
  shortcuts: {
    utility: 'u',
    component: 'b',
    descendent: 'e',
    modifier: 'm',
    when: 'is'
  }
}

// postcss 处理器
const processor = postcss([
  postcssBem(postcssBemOptions),
  postcssMixins,
  postcssAdvancedVariables,
  postcssCustomMedia,
  postcssCustomProperties,
  postcssMediaMinmax,
  postcssColorFunction,
  postcssNesting,
  postcssNested,
  postcssCustomSelectors,
  postcssAtroot,
  postcssPropertyLookup,
  postcssExtend,
  postcssSelectorMatches,
  postcssSelectorNot,
  postcssCalc,
  postcssUnit2rpx
])

export namespace WxSFMStyle {

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
   * Scss 编译配置
   *
   * @export
   * @interface ScssConfig
   */
  export interface ScssConfig {
    data?: string,
    file?: string
  }
}

/**
 * STYLE 模块类
 *
 * @export
 * @class WxSFMStyle
 * @extends {WxSFM}
 */
export class WxSFMStyle extends WxSFM {

  /**
   * PostCSS 处理器的结果
   *
   * @private
   * @type {postcss.Result}
   * @memberof WxSFMStyle
   */
  private result: postcss.Result

  /**
   * 依赖列表
   *
   * @private
   * @type {Depend[]}
   * @memberof WxSFMStyle
   */
  private depends: Depend[] = []

  /**
   * Creates an instance of WxSFMStyle.
   * @param {string} source
   * @param {Request} request
   * @param {CompileType} compileType
   * @memberof WxSFMStyle
   */
  constructor (source: string, request: Request, public options: WxSFMStyle.Options) {
    super(source, request, {
      destExt: config.ext.wxss
    })
    this.initDepends()
  }

  /**
   * style 基础编译
   *
   * @returns
   * @memberof WxSFMStyle
   */
  async compileStyle () {
    if (!this.result) return ''

    // 更新依赖路径后，重新编译
    return await postcss([
      postcssUnit2rpx
    ]).process(this.result).then(result => result.css)
  }

  /**
   * style less 编译
   *
   * @returns
   * @memberof WxSFMStyle
   */
  async compileLess () {
    if (!this.source) return ''

    // 1.0.5 版本以前，less 编译不支持 @import 外部文件
    // 1.0.5 版本开始，less 编译会将所有 @import 外部文件打包在一个入口文件
    // 将来的某个版本可能会调整 @import 外部文件分离编译

    let source = ''
    let options = {
      filename: this.request.src
    }

    source = this.source

    // 全局 style 样式
    source = Global.config.style.lessCode + '\n' + source

    // less 编译
    source = await less.render(source, options).then(result => result.css)

    // 经 postcss 编译 unit2px 转换
    source = await postcss([
      postcssUnit2rpx
    ]).process(source).then(result => result.css)

    return source
  }

  /**
   * style postcss 编译
   *
   * @returns
   * @memberof WxSFMStyle
   */
  async compilePcss () {
    if (!this.result) return ''

    // TODO 由于使用style样式全局变量，编译后的代码会存在多个 换行问题

    let source = ''

    // 从 result 中提取文件内容（依赖已更新）
    source = await postcss().process(this.result).then(result => result.css)

    // 全局 style 样式
    source = Global.config.style.pcssCode + '\n' + source

    // postcss 编译（bem、precss集合插件中排除import插件、unit2rpx）
    source = await processor.process(source).then(result => result.css)

    return source
  }

  /**
   *
   * 异步的 Sass 编译
   * @param {*} content
   * @param {*} file
   * @returns
   * @memberof WxSFMStyle
   */
  syncSass (content: string, file: string): Promise<string> {
    let config: WxSFMStyle.ScssConfig = {
      data: content,
      file: file
    }
    return new Promise(((resolve, reject) => {
      sass.render(config, (err, res: any) => {
        if (err) {
          log.error(err)
          reject(err)
        } else {
          resolve(res.css)
        }
      })
    }))
  }

  /**
   * style scss 编译
   *
   * @returns
   * @memberof WxSFMStyle
   */
  async compileScss () {
    if (!this.source) return ''

    let source = ''
    source = this.source

    // 全局 style 样式
    source = Global.config.style.scssCode + '\n' + source

    const file = this.request.src
    source = await this.syncSass(source, file)

    // 经 postcss 编译 unit2px 转换
    source = await postcss([
      postcssUnit2rpx
    ]).process(source).then(result => result.css)

    return source
  }

  /**
   * 生成代码
   *
   * @returns {Promise<string>}
   * @memberof WxSFMStyle
   */
  async generator (): Promise<string> {
    switch (this.options.compileType) {
      case CompileType.LESS:
        return await this.compileLess()

      case CompileType.PCSS:
        return await this.compilePcss()

      case CompileType.SCSS:
        return await this.compileScss()

      default:
        return await this.compileStyle()
    }
  }

  /**
   * 保存文件
   *
   * @memberof WxSFMStyle
   */
  save () {
    super.save()
  }

  /**
   * 移除文件
   *
   * @memberof WxSFMStyle
   */
  remove () {
    super.remove()
  }

  /**
   * 获取依赖列表
   *
   * @returns {Depend[]}
   * @memberof WxSFMStyle
   */
  getDepends (): Depend[] {
    return this.depends
  }

  /**
   * 更新依赖列表
   *
   * @param {Request.Core[]} useRequests 可用的请求列表
   * @memberof WxSFMStyle
   */
  updateDepends (useRequests: Request.Core[]): void {
    let depends = this.getDepends()

    if (!depends.length) return

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
          case RequestType.STYLE:
            // ② 更新依赖引用路径，将所有的扩展名统一改成 .wxss
            depend.$atRule.params = `'${request}${config.ext.wxss}'`
            break

          case RequestType.ICONFONT:
            let requestURL = url.parse(depend.request)
            // depend.request => ./iconfont.eot?t=1515059114217
            // depend.$decl.value => url('./iconfont.eot?t=1515059114217')
            depend.$decl.value = depend.$decl.value.replace(depend.request, `${request}${useRequest.ext}${requestURL.search}`)
            break
        }
      })
    })
  }

  /**
   * 初始化 depends 依赖列表
   *
   * @private
   * @memberof WxSFMStyle
   */
  private initDepends () {
    if (!this.source) return
    if (this.options.compileType === CompileType.LESS || this.options.compileType === CompileType.SCSS) return

    let transformer: postcss.Transformer = root => {
      // @import
      root.walkAtRules((rule, index) => {
        if (rule.name !== 'import') {
          return
        }
        // ① 收集所有的依赖，用于后续的依赖加载和路径更新
        this.depends.push({
          request: rule.params.replace(/^('|")(.*)('|")$/g, (match, quotn, filename) => filename),
          requestType: RequestType.STYLE,
          $atRule: rule
        })
      })

      // background background-image
      root.walkDecls((decl, index) => {
        // WXSS 里不用本地资源
        // background background-image => IMAGE
        // decl.prop !== 'background' && decl.prop !== 'background-image'

        // src => ICONFONT
        if (decl.prop !== 'src') {
          return
        }

        // src: url('./iconfont.eot?t=1515059114217');
        if (decl.value.indexOf('url') === -1) {
          return
        }

        // src: url('./iconfont.eot?t') format('embedded-opentype'), /* IE6-IE8 */
        //      url('./iconfont.ttf?t=1515059114217') format('truetype')
        let urls = decl.value.split(/format\([\'\"][a-z-]+[\'\"]\),/)

        urls.forEach(url => {
          let matchs = url.match(ICONFONT_PATTERN)
          if (!matchs) {
            return
          }

          // url('./iconfont.eot?t=1515059114217#iefix')
          url = matchs[1]

          // Check local image
          if (!util.checkLocalImgUrl(url)) {
            return
          }

          this.depends.push({
            request: url,
            requestType: RequestType.ICONFONT,
            $decl: decl
          })
        })
      })
    }
    let lazyResult = postcss([transformer]).process(this.source)
    lazyResult.toString()

    this.result = lazyResult['result']
  }
}

// import wxss 保留引用，不被插件编译
// class ImportWxssPlugin {
//   pick: postcss.Plugin<any>
//   revert: postcss.Plugin<any>

//   private atRules: postcss.AtRule[] = []

//   constructor () {
//     this._pick()
//     this._revert()
//   }

//   /**
//    * 摘取 @import *.wxss 扩展的路径引用
//    *
//    * @private
//    * @memberof ImportWxssPlugin
//    */
//   private _pick() {
//     this.pick = postcss.plugin('postcss-plugin-pick-import-wxss', () => {
//       return root => {
//         root.walkAtRules((rule, index) => {
//           if (rule.name === 'import' && /\.wxss('|")$/.test(rule.params)) {
//             root.removeChild(rule)
//             this.atRules.push(rule)
//           }
//         })
//       }
//     })
//   }

//   /**
//    * 归还 @import *.wxss 扩展的路径引用
//    *
//    * @private
//    * @memberof ImportWxssPlugin
//    */
//   private _revert() {
//     this.revert = postcss.plugin('postcss-plugin-revert-import-wxss', () => {
//       return root => {
//         if (root.nodes && this.atRules.length > 0) {
//           root.prepend(this.atRules)
//         }
//       }
//     })
//   }
// }
