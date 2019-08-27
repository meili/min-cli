import * as chokidar from 'chokidar'
import { CLIExample, Xcx, XcxNode } from '../class'
import util, { Global } from '../util'

export namespace DevCommand {

  /**
   * 选项
   *
   * @export
   * @interface Options
   */
  export interface Options {
    /**
     * 页面列表，如['pages/home/index', 'pages/loading/index']
     *
     * @type {string[]}
     * @memberof Options
     */
    pages?: string[],

    /**
     * 是否启用watch
     *
     * @type {boolean}
     * @memberof Options
     */
    watch?: boolean

    /**
     * 是否清除编译后的目录
     *
     * @type {boolean}
     * @memberof Options
     */
    clear?: boolean

    /**
     * 是否保存app.json配置
     *
     * @type {boolean}
     * @memberof Options
     */
    isSaveAppConfig?: boolean
  }

  /**
   * CLI选项
   *
   * @export
   * @interface CLIOptions
   */
  export interface CLIOptions {
    // 作为第三方工具，在已有的项目中使用
    third?: boolean

    // third 前提下，仅编译wxc组件
    onlyBuildWxc?: boolean
  }
}

/**
 * 开发类
 *
 * @export
 * @class DevCommand
 */
export class DevCommand {
  private watcher: chokidar.FSWatcher | null

  constructor (public options: DevCommand.Options) {
  }

  async run () {
    let { pages, watch, clear, isSaveAppConfig } = this.options

    Global.isDebug = !!pages && pages.length > 0

    let xcx = new Xcx({
      isClear: clear,
      app: {
        isSFC: true
      },
      pages,
      traverse: {
        enter (xcxNode: XcxNode) {
          xcxNode.compile()
        },
        pages (pages: string[]) {
          isSaveAppConfig && Global.saveAppConfig(pages)
        }
      }
    })
    xcx.compile()
    if (watch) {
      this.watcher = xcx.watch()
    } else {
      this.watcher = null
    }

    return Promise.resolve()
  }

  /**
   * 关闭监听
   *
   * @memberof DevCommand
   */
  closeWatch () {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
  }
}

/**
 * Commander 命令行配置
 */
export default {
  name: 'dev [name]',
  alias: '',
  usage: '[name]',
  description: '调试页面',
  options: [
    ['--third', 'As a third party，Used in existing projects'],
    ['--onlyBuildWxc', 'As a third party，only build wxc components']
  ],
  on: {
    '--help': () => {
      new CLIExample('dev')
        .group('调试项目')
        .rule('')

        .group('支持英文逗号分隔，来同时调试多个页面')
        .rule('home,loading')
    }
  },
  async action (name: string, options: DevCommand.CLIOptions) {

    if (options.third) {
      this.actionThird()
      return
    }

    let pages = util.pageName2Pages(name)
    let devCommand = new DevCommand({
      pages,
      watch: true,
      clear: true,
      isSaveAppConfig: true
    })
    await devCommand.run()
  },

  async actionThird () {
    let pages = util.getThirdWxpPages()
    Global.isDebug = !!pages && pages.length > 0

    let xcx = new Xcx({
      pages,
      traverse: {
        enter (xcxNode: XcxNode) {
          xcxNode.compile()
        }
      }
    })
    xcx.compileThird()
    this.watcher = xcx.watch()
  }
}
