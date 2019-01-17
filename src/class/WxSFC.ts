import { Depend, Request, WxFile, WxSFMScript, WxSFMStyle, WxSFMTemplate } from '../class'
import { dom } from '../util'

/**
 * 单文件组合类
 *
 * @export
 * @class WxSFC
 * @implements {WxFile.Core}
 */
export class WxSFC implements WxFile.Core {
  /**
   * 单文件组合，与.js、.json、.wxml、.wxss组件成一体 (单文件组件、单文件页面、单文件应用)
   */
  template: WxSFMTemplate
  style: WxSFMStyle
  script: WxSFMScript

  /**
   * Creates an instance of WxSFC.
   * @param {string} source
   * @param {Request} request
   * @memberof WxSFC
   */
  constructor (public source: string, request: Request) {
    let {
      script: { code: scriptCode, compileType: scriptCompileType },
      template: { code: templateCode, compileType: templateCompileType },
      style: { code: styleCode, compileType: styleCompileType }
    } = dom.getSFC(this.source)

    // SCRIPT
    this.script = new WxSFMScript(scriptCode, request, {
      compileType: scriptCompileType
    })

    let usingComponents = this.script.getUsingComponents()

    // TEMPLATE
    this.template = new WxSFMTemplate(templateCode, request, {
      compileType: templateCompileType,
      usingComponents
    })

    // STYLE
    this.style = new WxSFMStyle(styleCode, request, {
      compileType: styleCompileType
    })
  }

  /**
   * 单文件模块列表，包括模板，脚本和样式
   *
   * @readonly
   * @memberof WxSFC
   */
  get sfms () {
    return [this.template, this.style, this.script]
  }

  /**
   * 保存文件
   *
   * @memberof WxSFC
   */
  save () {
    this.sfms.forEach(sfm => sfm.save())
  }

  /**
   * 移除文件
   *
   * @memberof WxSFC
   */
  remove () {
    this.sfms.forEach(sfm => sfm.remove())
  }

  /**
   * 获取依赖列表
   *
   * @returns {Depend[]}
   * @memberof WxSFC
   */
  getDepends (): Depend[] {
    return Array.prototype.concat.apply([], this.sfms.map(sfm => sfm.getDepends()))
  }

  /**
   * 更新依赖列表
   *
   * @param {Request.Core[]} useRequests 可用的请求列表
   * @memberof WxSFC
   */
  updateDepends (useRequests: Request.Core[]): void {
    this.sfms.forEach(sfm => sfm.updateDepends(useRequests))
  }
}
