import * as fs from 'fs-extra'
import * as path from 'path'
import * as _ from 'lodash'
import { CLIExample } from '../class'
import util, { config, exec, log, LogType } from '../util'
import { NpmDest, BabelES6 } from '../qa'

export namespace UpdateCommand {
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
    pkgNames?: string[]
  }

  /**
   * CLI选项
   *
   * @export
   * @interface CLIOptions
   */
  export interface CLIOptions {}
}

/**
 * 更新类
 *
 * @export
 * @class UpdateCommand
 */
export class UpdateCommand {
  constructor (public options: UpdateCommand.Options) {
  }

  async run () {
    let { pkgNames = [] } = this.options
    await this.update(pkgNames)
    util.buildNpmWXCs(pkgNames)
  }

  private async update (pkgNames: string[]) {
    // print run log
    pkgNames.forEach(pkgName => {
      log.msg(LogType.RUN, `npm update ${pkgName}`)
    })
    log.newline()

    // run npm update
    await exec('npm', ['update', ...pkgNames], true, {
      cwd: config.cwd
    })
    log.newline()
  }
}

/**
 * Commander 命令行配置
 */
export default {
  name: 'update [name]',
  alias: 'u',
  usage: '[name]',
  description: '更新组件',
  options: [],
  on: {
    '--help': () => {
      new CLIExample('update')
        .group('更新已安装的组件')
        .rule('')

        .group('更新loading组件')
        .rule('@minui/wxc-loading')

        .group('支持英文逗号分隔，来同时更新多个组件')
        .rule('@minui/wxc-loading,@minui/wxc-loading')
    }
  },
  async action (name: string, cliOptions: UpdateCommand.CLIOptions) {

    let pkgNames = getPkgNames(name)

    if (pkgNames.length === 0) {
      log.warn('没有找到需要更新的组件')
      return
    }

    try {
      await NpmDest.setAnswer()
      await BabelES6.setAnswer()

      let updateCommand = new UpdateCommand({
        pkgNames
      })
      await updateCommand.run()

    } catch (err) {
      log.error(err)
    }
  }
}

function getPkgNames (name: string) {
  let pkgNames: string[] = []

  if (name && name.trim()) { // from cli
    pkgNames = name.trim().split(',')
  } else { // from dependencies and devDependencies
    let pkgPath = path.join(config.cwd, 'package.json')

    if (fs.existsSync(pkgPath)) {
      let pkgData = fs.readJsonSync(pkgPath)
      pkgNames = _.keys(_.assign(pkgData.dependencies, pkgData.devDependencies))
    }
  }
  return pkgNames
}
