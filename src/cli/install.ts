
import { CLIExample } from '../class'
import util, { config, exec, log, LogType } from '../util'
import { NpmDest, BabelES6 } from '../qa'

export namespace InstallCommand {
  /**
   * 选项
   *
   * @export
   * @interface Options
   */
  export interface Options {
    /**
     * 包名列表，如：['@minui/wxc-loading'、'@minui/wxc-tab']
     *
     * @type {string []}
     * @memberof Options
     */
    pkgNames: string []
  }

  /**
   * 命令行选项
   *
   * @export
   * @interface CLIOptions
   */
  export interface CLIOptions {

  }
}

/**
 * 安装类
 *
 * @export
 * @class InstallCommand
 */
export class InstallCommand {
  constructor (public options: InstallCommand.Options) {

  }

  async run () {
    let { pkgNames } = this.options
    await this.install(pkgNames)
    util.buildNpmWXCs(pkgNames)

    // await this.viewUse(pkgNames)
  }

  private async install (pkgNames: string[]) {
    // print run log
    pkgNames.forEach(pkgName => {
      log.msg(LogType.RUN, `npm install ${pkgName} --save`)
    })
    log.newline()

    // run npm install
    await exec('npm', ['install', ...pkgNames, '--save'], true, {
      cwd: config.cwd
    })
    log.newline()
  }

  // private async viewUse (pkgNames: string[]) {
  //   pkgNames.forEach(pkgName => {
  //     log.msg(LogType.COMPLETE, `${pkgName} 安装完成，in ${path.join(config.npm.dest, pkgName)}`)
  //   })
  // }
}

/**
 * Commander 命令行配置
 */
export default {
  name: 'install <name>',
  alias: 'i',
  usage: '<name>',
  description: '安装组件',
  options: [],
  on: {
    '--help': () => {
      new CLIExample('install')
        .group('安装loading组件')
        .rule('@minui/wxc-loading')

        .group('支持英文逗号分隔，来同时安装多个组件')
        .rule('@minui/wxc-loading,@minui/wxc-loading')
    }
  },
  async action (name: string, cliOptions: InstallCommand.CLIOptions) {
    let pkgNames: string[] = name ? name.trim().split(',') : []

    try {
      await NpmDest.setAnswer()
      await BabelES6.setAnswer()

      let installCommand = new InstallCommand({
        pkgNames
      })
      await installCommand.run()

    } catch (err) {
      log.error(err)
    }
  }
}
