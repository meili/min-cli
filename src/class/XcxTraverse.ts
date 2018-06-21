import * as _ from 'lodash'
import * as path from 'path'
import { XcxNode } from '../class'
import { RequestType } from '../declare'
import { config } from '../util'

export namespace XcxTraverse {
  export type VisitType = 'start' | 'end' | 'enter' | 'exit' | 'app' | 'page' | 'component' | 'pages' | 'components'

  export type VisitNode<T> = VisitNodeFunction<T> | VisitNodeObject<T>

  export type VisitNodeFunction<T> = (xcxNode: T) => void

  export interface VisitNodeObject<T> {
    /**
     * 进入
     *
     * @param {T} xcxNode
     * @memberof VisitNodeObject
     */
    enter? (xcxNode: T): void

    /**
     * 退出
     *
     * @param {T} xcxNode
     * @memberof VisitNodeObject
     */
    exit? (xcxNode: T): void
  }

  /**
   * 访问器
   *
   * @export
   * @interface Visitor
   * @extends {VisitNodeObject<T>}
   * @template T
   * @template XcxNode
   */
  export interface Visitor<T = XcxNode> extends VisitNodeObject<T> {
    /**
     * 开始
     *
     * @memberof Visitor
     */
    start?: () => void

    /**
     * 结束
     *
     * @memberof Visitor
     */
    end?: () => void

    /**
     * App 访问者 app.js and app.wxss
     *
     * @type {VisitNode<T>}
     * @memberof Visitor
     */
    app?: VisitNode<T>

    /**
     * Page 访问者 index.wxp
     *
     * @type {VisitNodeFunction<T>}
     * @memberof Visitor
     */
    page?: VisitNodeFunction<T>

    /**
     * Component 访问者 index.wxc
     *
     * @type {VisitNodeFunction<T>}
     * @memberof Visitor
     */
    component?: VisitNodeFunction<T>

    /**
     * Page List 访问者 [index.wxp, index.wxp]
     *
     * @type {VisitNodeFunction<string[]>}
     * @memberof Visitor
     */
    pages?: VisitNodeFunction<string[]>

    /**
     * Component List 访问者 [index.wxc, index.wxc]
     *
     * @type {VisitNodeFunction<T[]>}
     * @memberof Visitor
     */
    components?: VisitNodeFunction<T[]>
  }

  export interface Options extends Visitor { }
}

/**
 * 小程序转换器，用于 XcxNode 节点树的转换
 *
 * @export
 * @class XcxTraverse
 */
export class XcxTraverse {

  /**
   * pages 页面路径列表，与 app.json 中的 pages 字段的格式一致
   *
   * @private
   * @type {string[]}
   * @memberof XcxTraverse
   */
  private pages: string[] = []

  /**
   * components 组件路径列表
   *
   * @private
   * @type {string[]}
   * @memberof XcxTraverse
   */
  private components: string[] = []

  /**
   * Creates an instance of XcxTraverse.
   * @param {XcxTraverse.Options} options
   * @memberof XcxTraverse
   */
  constructor (private options: XcxTraverse.Options) { }

  /**
   * 转换，它是一个静态方法
   *
   * @static
   * @param {(XcxNode | XcxNode[])} parent
   * @param {XcxTraverse.Options} options
   * @memberof XcxTraverse
   */
  public static traverse (parent: XcxNode | XcxNode[], options: XcxTraverse.Options) {
    let xcxTraverse = new XcxTraverse(options)
    xcxTraverse.traverse(parent)
  }

  /**
   * 转换
   *
   * @param {(XcxNode | XcxNode[])} parent
   * @memberof XcxTraverse
   */
  public traverse (parent: XcxNode | XcxNode[]) {
    if (_.isArray(parent) && parent.length === 0) {
      return
    }
    // 触发 start 开始访问器
    this.trigger('start', undefined)

    // 递归
    this.recursive(parent)

    // 触发 pages 页面列表访问器
    if (this.pages.length > 0) {
      this.trigger('pages', this.pages)
    }

    // 触发 components 组件列表访问器
    if (this.components.length > 0) {
      this.trigger('components', this.components)
    }

    // 触发 end 结束访问器
    this.trigger('end', undefined)
  }

  /**
   * page 页面地址替换器
   *
   * @private
   * @param {string} destRelative
   * @returns {string}
   * @memberof XcxTraverse
   */
  private pageReplacer (destRelative: string): string {
    let regExp = new RegExp(`(^${config.dest}\\${path.sep})|(${config.ext.wxp}$)`, 'g')
    return destRelative.replace(regExp, '').split(path.sep).join('/')
  }

  /**
   * component 组件地址替换器
   *
   * @private
   * @param {string} destRelative
   * @returns {string}
   * @memberof XcxTraverse
   */
  private componentReplacer (destRelative: string): string {
    let regExp = new RegExp(`(^${config.dest}\\${path.sep})|(${config.ext.wxc}$)`, 'g')
    return destRelative.replace(regExp, '').split(path.sep).join('/')
  }

  /**
   * 递归节点树
   *
   * @private
   * @param {(XcxNode | XcxNode[])} parent
   * @memberof XcxTraverse
   */
  private recursive (parent: XcxNode | XcxNode[]) {
    if (_.isArray(parent)) {
      parent.forEach(this.resolve.bind(this))
    } else if (parent) {
      this.resolve(parent)
    }
  }

  /**
   * 解析一个 XcxNode 节点
   *
   * @private
   * @param {XcxNode} xcxNode
   * @memberof XcxTraverse
   */
  private resolve (xcxNode: XcxNode) {
    // 触发 enter 进入访问器
    this.trigger('enter', xcxNode)
    let { request } = xcxNode

    switch (request.requestType) {
      case RequestType.WXA:
        // 触发 app 应用访问器
        this.trigger('app', xcxNode)
        break

      case RequestType.WXP:
        this.pages = _.union(this.pages, [
          this.pageReplacer(request.destRelative)
        ])
        // 触发 page 页面访问器
        this.trigger('page', xcxNode)
        break

      case RequestType.WXC:
        this.components = _.union(this.components, [
          this.componentReplacer(request.destRelative)
        ])
        // 触发 component 组件访问器
        this.trigger('component', xcxNode)
        break

      default:
        break
    }

    // 递归子集
    this.recursive(xcxNode.children)

    // 触发 exit 退出访问器
    this.trigger('exit', xcxNode)
  }

  /**
   * 触发访问者事件
   *
   * @private
   * @param {XcxTraverse.VisitType} method
   * @param {(undefined | string[] | XcxNode | XcxNode[])} value
   * @memberof XcxTraverse
   */
  private trigger (method: XcxTraverse.VisitType, value: undefined | string[] | XcxNode | XcxNode[]) {
    let _method = this.options[method]
    if (_.isFunction(_method)) {
      _method.call(this.options, value)
    }
  }
}
