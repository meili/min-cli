import { Depend, Request, WxFile, WxSFMTemplate, WxSFMScript, WxSFMStyle } from '../class'
import { LangTypes } from '../declare'

/**
 * 原生文件组合类
 *
 * @export
 * @class WxNFC
 * @implements {WxFile.Core}
 */
export class WxNFC implements WxFile.Core {
  sfm: WxSFMTemplate | WxSFMStyle | WxSFMScript

  /**
   * Creates an instance of WxNFC.
   * @param {string} source
   * @param {Request} request
   * @memberof WxNFC
   */
  constructor (public source: string, public request: Request) {
    let { isScript, isStyle, isTemplate } = request
    let { compileType = undefined } = LangTypes[request.ext] || {}

    if (isScript) {
      // SCRIPT
      this.sfm = new WxSFMScript(this.source, request, {
        compileType
      })
    } else if (isStyle) {
      // STYLE
      this.sfm = new WxSFMStyle(this.source, request, {
        compileType
      })
    } else if (isTemplate) {
      // TEMPLATE
      this.sfm = new WxSFMTemplate(this.source, request, {
        compileType
      })
    } else {
      throw new Error(`创建【WxNFC】失败，没有找到扩展名为 ${request.ext} 的编译类型`)
    }
  }

  /**
   * 保存文件
   *
   * @memberof WxNFC
   */
  save () {
    this.sfm.save()
  }

  /**
   * 移除文件
   *
   * @memberof WxNFC
   */
  remove () {
    this.sfm.remove()
  }

  /**
   * 获取依赖列表
   *
   * @returns {Depend[]}
   * @memberof WxNFC
   */
  getDepends (): Depend[] {
    return this.sfm.getDepends()
  }

  /**
   * 更新依赖列表
   *
   * @param {Request.Core[]} useRequests 可用的请求列表
   * @memberof WxNFC
   */
  updateDepends (useRequests: Request.Core[]): void {
    this.sfm.updateDepends(useRequests)
  }
}
