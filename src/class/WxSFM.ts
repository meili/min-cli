import * as path from 'path'
import * as _ from 'lodash'
import { Depend, Request } from '../class'
import util, { log, LogType, config } from '../util'

export namespace WxSFM {

  /**
   * 选项
   *
   * @export
   * @interface Options
   */
  export interface Options {

    /**
     * SFM EXT NAME (单文件模块的原生目标路径的扩展名)
     *
     * @type {string}
     * @memberof Options
     */
    destExt: string
  }
}

/**
 * 单文件模块
 *
 * @export
 * @class WxSFM
 */
export class WxSFM {
  public source: string
  protected dest: string
  protected destRelative: string
  protected destExt: string

  /**
   * Creates an instance of WxSFM.
   * @param {string} source
   * @param {Request} request
   * @param {WxSFM.Options} options
   * @memberof WxSFM
   */
  constructor (source: string, public request: Request, options: WxSFM.Options) {
    this.source = (source || '').trim()
    this.destExt = options.destExt
    this.initDest()
  }

  /**
   * 是否.wxa扩展，同Request.isWxa
   *
   * @readonly
   * @memberof WxSFM
   */
  get isWxa () {
    return this.request.isWxa
  }

  /**
   * 是否.wxp扩展，同Request.isWxp
   *
   * @readonly
   * @memberof WxSFM
   */
  get isWxp () {
    return this.request.isWxp
  }

  /**
   * 是否.wxc扩展，同Request.isWxc
   *
   * @readonly
   * @memberof WxSFM
   */
  get isWxc () {
    return this.request.isWxc
  }

  /**
   * 是否单文件类型，同Request.isSFC
   *
   * @readonly
   * @memberof WxSFM
   */
  get isSFC () {
    return this.request.isSFC
  }

  /**
   * 返回通过新的扩展名与 request.dest的目标绝对路径生成新的 dest目标绝对路径 和 destRelative目标相对路径
   *
   * @param {string} ext
   * @returns
   * @memberof WxSFM
   */
  getDester (ext: string) {
    let ppath = path.parse(this.request.dest)
    ppath.base = ppath.name + ext
    ppath.ext = ext
    let dest = path.format(ppath)
    let destRelative = path.relative(config.cwd, dest)
    return {
      dest,
      destRelative
    }
  }

  // 生成
  generator (): Promise<string> | string {
    log.fatal('WxSFM.generator Method not implemented.')
    return ''
  }

  // 保存前
  beforeSave (): void {
    //
  }

  // 保存
  save (): void {
    this.beforeSave()
    let code = this.generator()
    if (_.isString(code)) {
      this.write(code)
    } else {
      code.then(this.write.bind(this))
    }
    this.afterSave()
  }

  // 保存后
  afterSave (): void {
    //
  }

  // 移除前
  beforeRemove (): void {
    //
  }

  // 移除
  remove (): void {
    this.beforeRemove()
    log.msg(LogType.DELETE, this.destRelative)
    util.unlink(this.dest)
    this.afterRemove()
  }

  // 移除后
  afterRemove (): void {
    //
  }

  // 获取依赖
  getDepends (): Depend[] {
    log.fatal('WxSFM.getDepends Method not implemented.')
    return []
  }

  // 更新依赖
  updateDepends (uses: Request.Core[]): void {
    log.fatal('WxSFM.updateRequest Method not implemented.')
  }

  /**
   * 设置 dest目标绝对路径 和 destRelative目标相对路径
   *
   * @private
   * @memberof WxSFM
   */
  private initDest () {
    let dester = this.getDester(this.destExt)
    this.dest = dester.dest
    this.destRelative = dester.destRelative
  }

  /**
   * 将内容写入到 dest目标绝对路径
   *
   * @private
   * @param {string} code
   * @memberof WxSFM
   */
  private write (code: string) {
    log.msg(LogType.WRITE, this.destRelative)
    util.writeFile(this.dest, code)
  }
}
