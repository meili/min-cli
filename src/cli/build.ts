import * as path from 'path'
import * as fs from 'fs-extra'
import * as _ from 'lodash'
import { CLIExample, Xcx, XcxNode } from '../class'
import { ProjectType } from '../declare'
import util, { Global, config, log } from '../util'
import { NpmDest, BabelES6 } from '../qa'

export namespace BuildCommand {
  /**
   * 选项
   *
   * @export
   * @interface Options
   */
  export interface Options {
    /**
     * 是否包含命令行交互式问答
     *
     * @type {Boolean}
     * @memberof Options
     */
    hasPrompt?: Boolean
  }

  /**
   * CLI选项
   *
   * @export
   * @interface CLIOptions
   */
  export interface CLIOptions {
  }
}

/**
 * 构建类
 *
 * @export
 * @class BuildCommand
 */
export class BuildCommand {
  constructor (public options: BuildCommand.Options = {}) {
  }

  async run () {
    // TODO 此处全局污染，待优化
    Global.isDebug = false

    switch (config.projectType as ProjectType) {
      case ProjectType.Application:
      case ProjectType.Component:
        {
          await this.buildMinProject()
        }
        break

      default:
        {
          await this.buildNpmDepends()
        }
        break
    }
  }

  /**
   * 编译 Min 项目项目
   *
   */
  private async buildMinProject () {
    let xcx = new Xcx({
      isClear: true,
      app: {
        isSFC: true
      },
      traverse: {
        enter (xcxNode: XcxNode) {
          xcxNode.compile()
        },
        pages (pages: string[]) {
          Global.saveAppConfig(pages)
        }
      }
    })
    xcx.compile()
  }

  /**
   * 编译 NPM 依赖小程序组件
   *
   */
  private async buildNpmDepends () {
    let pkgNames: string[] = []

    let pkgPath = path.join(config.cwd, 'package.json')

    if (fs.existsSync(pkgPath)) {
      let pkgData = fs.readJsonSync(pkgPath)
      pkgNames = _.keys(_.assign(pkgData.dependencies, pkgData.devDependencies))
    }

    if (pkgNames.length === 0) {
      log.error(`Min Build，没有需要编译的组件`)
      return
    }

    if (this.options.hasPrompt) {
      await NpmDest.setAnswer()
      await BabelES6.setAnswer()
    }

    util.buildNpmWXCs(pkgNames)
  }
}

/**
 * Commander 命令行配置
 */
export default {
  name: 'build',
  alias: '',
  usage: '',
  description: '编译项目',
  options: [],
  on: {
    '--help': () => {
      new CLIExample('build')
        .group('编译')
        .rule('')
    }
  },
  async action (cliOptions: BuildCommand.CLIOptions) {
    let buildCommand = new BuildCommand({
      hasPrompt: true
    })
    await buildCommand.run()
  }
}
