import * as _ from 'lodash'
import * as changeCase from 'change-case'
import { RequestType } from '../declare'
import { config, resolveDep } from '../util'

export namespace Request {

  /**
   * 选项
   *
   * @export
   * @interface Options
   */
  export interface Options {
    /**
     * 地址，通常以.(点)、alias(别名)、npm（包名称）开始的相对路径，当isMain选项值为真时则允许为绝对路径
     *
     * @type {string}
     * @memberof Options
     */
    request: string,

    /**
     * 类型
     *
     * @type {string}
     * @memberof Options
     */
    requestType?: RequestType

    /**
     * 父src源文件地址
     *
     * @type {string}
     * @memberof Options
     */
    parent?: string,

    /**
     * 是否为主入口文件，默认为false
     *
     * @type {boolean}
     * @memberof Options
     */
    isMain?: boolean,

    /**
     * 是否为发布组件，它仅用于 min publish 发布组件传入真值，请求依赖的目标路径将保留 src 部分，它不做dest路径替换
     *
     * @type {boolean}
     * @memberof Options
     */
    isPublish?: boolean

    /**
     * 是否来自第三方NPM
     *
     * @type {boolean}
     * @memberof Options
     */
    isThreeNpm?: boolean

    /**
     * 小程序分包名称
     *
     * @type {string}
     * @memberof Options
     */
    xcxPackageName?: string
  }

  /**
   * 基础
   *
   * @export
   * @interface Default
   */
  export interface Default {
    /**
     * 地址
     *
     * @type {string}
     * @memberof Default
     */
    request: string

    /**
     * 类型
     *
     * @type {RequestType}
     * @memberof Default
     */
    requestType: RequestType

    /**
     * 虚拟文件
     *
     * @type {Boolean}
     * @memberof Default
     */
    isVirtual?: Boolean
  }

  /**
   * 路径
   *
   * @export
   * @interface Path
   */
  export interface Path {

    /**
     * 源绝对地址
     *
     * @type {string}
     * @memberof Path
     */
    src: string

    /**
     * 源相对地址
     *
     * @type {string}
     * @memberof Path
     */
    srcRelative: string

    /**
     * 源扩展名
     *
     * @type {string}
     * @memberof Path
     */
    ext: string

    /**
     * 目标绝对地址
     *
     * @type {string}
     * @memberof Path
     */
    dest: string

    /**
     * 目标相对地址
     *
     * @type {string}
     * @memberof Path
     */
    destRelative: string

    /**
     * 是否来自第三方NPM
     *
     * @type {boolean}
     * @memberof Core
     */
    isThreeNpm: boolean

    /**
     * 小程序分包名称
     *
     * @type {string}
     * @memberof Options
     */
    xcxPackageName?: string
  }

  /**
   * 核心
   *
   * @export
   * @interface Core
   * @extends {Request.Default} 基础
   * @extends {Request.Path} 路径
   */
  export interface Core extends Default, Path {}

  /**
   * 扩展
   *
   * @export
   * @interface Extend
   */
  export interface Extend {

    /**
     * 是否.wxa扩展
     *
     * @type {boolean}
     * @memberof Extend
     */
    isWxa: boolean

    /**
     * 是否.wxp扩展
     *
     * @type {boolean}
     * @memberof Extend
     */
    isWxp: boolean

    /**
     * 是否.wxc扩展
     *
     * @type {boolean}
     * @memberof Extend
     */
    isWxc: boolean

    /**
     * 是否.wxml扩展
     *
     * @type {boolean}
     * @memberof Extend
     */
    isWxml: boolean

    /**
     * 是否.wxss扩展
     *
     * @type {boolean}
     * @memberof Extend
     */
    isWxss: boolean

    /**
     * 是否.wxs扩展
     *
     * @type {boolean}
     * @memberof Extend
     */
    isWxs: boolean

    /**
     * 是否.js扩展
     *
     * @type {boolean}
     * @memberof Extend
     */
    isJs: boolean

    /**
     * 是否.ts扩展
     *
     * @type {boolean}
     * @memberof Extend
     */
    isTs: boolean

    /**
     * 是否.cs扩展
     *
     * @type {boolean}
     * @memberof Extend
     */
    isCs: boolean

    /**
     * 是否.json扩展
     *
     * @type {boolean}
     * @memberof Extend
     */
    isJson: boolean

    /**
     * 是否.css扩展
     *
     * @type {boolean}
     * @memberof Extend
     */
    isCss: boolean

    /**
     * 是否.less扩展
     *
     * @type {boolean}
     * @memberof Extend
     */
    isLess: boolean

    /**
     * 是否.pcss扩展
     *
     * @type {boolean}
     * @memberof Extend
     */
    isPcss: boolean

    /**
     * 是否.sass扩展
     *
     * @type {boolean}
     * @memberof Extend
     */
    isSass: boolean

    /**
     * 是否.stylus扩展
     *
     * @type {boolean}
     * @memberof Extend
     */
    isStylus: boolean

    /**
     * 是否单文件类型，比如.wxa .wxp .wxc，当isWxa isWxp isWxc 三者中值存在真时它就为真
     *
     * @type {boolean}
     * @memberof Extend
     */
    isSFC: boolean

    /**
     * 是否原生文件类型，理论上非单文件类型的都属于原生文件，当isTemplate isScript isStyle 三者中值存在真时它就为真
     *
     * @type {boolean}
     * @memberof Extend
     */
    isNFC: boolean

    /**
     * 是否模板文件类型，比如.wxml等
     *
     * @type {boolean}
     * @memberof Extend
     */
    isTemplate: boolean

    /**
     * 是否脚本文件类型，比如.js .ts .cs .wxs等
     *
     * @type {boolean}
     * @memberof Extend
     */
    isScript: boolean

    /**
     * 是否为样式文件类型，比如.css .wxss .less .pcss等
     *
     * @type {boolean}
     * @memberof Extend
     */
    isStyle: boolean

    isPng: boolean
    isJpg: boolean
    isJpeg: boolean
    isGif: boolean
    isBmp: boolean
    isWebp: boolean

    /**
     * 是否为图片文件类型，比如.png .jpeg .gif .bmp .webp
     *
     * @type {boolean}
     * @memberof Extend
     */
    isImage: boolean

    isEot: boolean
    isSvg: boolean
    isTtf: boolean
    isWoff: boolean

    /**
     * 是否为图标字体文件，比如.eot .svg .ttf .woff
     *
     * @type {boolean}
     * @memberof Extend
     */
    isIconFont: boolean
  }
}

/**
 * 请求核心类
 *
 * @export
 * @class RequestCore
 * @implements {Request.Core}
 */
export class RequestCore implements Request.Core {
  request: string
  requestType: RequestType
  src: string
  srcRelative: string
  ext: string
  dest: string
  destRelative: string
  /**
   * 是否来自第三方NPM
   *
   * @type {boolean}
   * @memberof RequestCore
   */
  isThreeNpm: boolean

  /**
   * 小程序分包名称
   *
   * @type {string}
   * @memberof Options
   */
  xcxPackageName?: string

  /**
   * Creates an instance of RequestCore.
   * @param {Request.Options} options
   * @memberof RequestCore
   */
  constructor (options: Request.Options) {
    // 通过resolveDep的请求依赖分析方法，将结果合并到RequestCore实例
    _.merge(this, resolveDep(options))
  }
}

/**
 * 请求扩展类
 *
 * @export
 * @class RequestExtend
 * @extends {RequestCore}
 * @implements {Request.Extend}
 */
export class RequestExtend extends RequestCore implements Request.Extend {
  isWxa: boolean
  isWxp: boolean
  isWxc: boolean

  isWxml: boolean
  isWxss: boolean

  isJs: boolean
  isTs: boolean
  isCs: boolean

  isJson: boolean
  isWxs: boolean

  isPng: boolean
  isJpg: boolean
  isJpeg: boolean
  isGif: boolean
  isBmp: boolean
  isWebp: boolean

  isEot: boolean
  isSvg: boolean
  isTtf: boolean
  isWoff: boolean

  isCss: boolean
  isLess: boolean
  isPcss: boolean
  isSass: boolean
  isStylus: boolean

  /**
   * 是否单文件类型
   *
   * @readonly
   * @memberof RequestExtend
   */
  get isSFC () {
    return this.isWxa || this.isWxp || this.isWxc
  }

  /**
   * 是否原生文件类型
   *
   * @readonly
   * @memberof RequestExtend
   */
  get isNFC () {
    return this.isTemplate || this.isScript || this.isStyle
  }

  /**
   * 是否模板文件类型
   *
   * @readonly
   * @memberof RequestExtend
   */
  get isTemplate () {
    return this.isWxml
  }

  /**
   * 是否脚本文件类型
   *
   * @readonly
   * @memberof RequestExtend
   */
  get isScript () {
    return this.isJs || this.isTs || this.isCs || this.isWxs
  }

  /**
   * 是否样式文件类型
   *
   * @readonly
   * @memberof RequestExtend
   */
  get isStyle () {
    return this.isCss || this.isWxss || this.isLess || this.isPcss || this.isSass || this.isStylus
  }

  /**
   * 是否为静态文件（无依赖、无编译）
   *
   * @readonly
   * @memberof RequestExtend
   */
  get isStatic () {
    return this.isJson || this.isImage || this.isIconFont
  }

  /**
   * 是否为图标字体文件
   *
   * @readonly
   * @memberof RequestExtend
   */
  get isIconFont () {
    return this.isEot || this.isSvg || this.isTtf || this.isWoff
  }

  /**
   * 是否为图片文件
   *
   * @readonly
   * @memberof RequestExtend
   */
  get isImage () {
    return this.isPng || this.isJpg || this.isJpeg || this.isGif || this.isBmp || this.isWebp
  }

  /**
   * Creates an instance of RequestExtend.
   * @param {Request.Options} options
   * @memberof RequestExtend
   */
  constructor (options: Request.Options) {
    super(options)

    // 通过扩展名，取得key值
    let key = _.findKey(config.ext, value => value === this.ext)
    if (key) {
      // 通过 key 值，设置实例中对应字段的真值，其余都为假值
      this[`is${changeCase.pascalCase(key)}`] = true
    }
  }
}

/**
 * 请求类
 *
 * @export
 * @class Request
 * @extends {RequestExtend}
 */
export class Request extends RequestExtend {
  constructor (options: Request.Options) {
    super(options)
  }
}
