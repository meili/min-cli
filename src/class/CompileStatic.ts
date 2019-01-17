import { Depend, Request, WxFile } from '../class'
import util, { config, log, LogType } from '../util'

/**
 * 编译静态文件
 *
 * @export
 * @class CompileStatic
 * @implements {WxFile.Core}
 */
export class CompileStatic implements WxFile.Core {

  /**
   * Creates an instance of CompileStatic.
   * @param {Request} request
   * @memberof CompileStatic
   */
  constructor (public request: Request) {

  }

  /**
   * 保存文件
   *
   * @memberof CompileStatic
   */
  save () {
    if (this.request.isJson) {
      let content = util.readFile(this.request.src)
      // src => *.json = {}
      // dest => *.json.js = module.exports = {}
      log.msg(LogType.BUILD, this.request.srcRelative)
      log.msg(LogType.WRITE, `${this.request.destRelative}.js`)
      util.writeFile(this.request.dest + config.ext.js, `module.exports = ${content}`)
    } else {
      log.msg(LogType.COPY, `${this.request.srcRelative} To ${this.request.destRelative}`)
      util.copyFile(this.request.src, this.request.dest)
    }
  }

  /**
   * 移除文件
   *
   * @memberof CompileStatic
   */
  remove () {
    log.msg(LogType.DELETE, this.request.destRelative)
    util.unlink(this.request.dest)
  }

  /**
   * 获取依赖列表
   *
   * @returns {Depend[]}
   * @memberof CompileStatic
   */
  getDepends (): Depend[] {
    return []
  }

  /**
   * 更新依赖列表
   *
   * @param {Request.Core[]} useRequests 可用的请求列表
   * @memberof CompileStatic
   */
  updateDepends (useRequests: Request.Core[]): void {
    //
  }
}
