'use strict'

import * as fs from 'fs-extra'
import { CLIExample } from '../class'
import util, { config, log, LogType } from '../util'

export namespace PackagesCommand {

  /**
   * 选项
   *
   * @export
   * @interface Options
   */
  export interface Options {
    /**
     * 组件名 或 页面名，如：wxc-loading 或 loading
     *
     * @type {string}
     * @memberof Options
     */
    name?: string
  }

  /**
   * CLI选项
   *
   * @export
   * @interface CLIOptions
   */
  export interface CLIOptions {
    /**
     * 是否删除
     *
     * @type {boolean}
     * @memberof CLIOptions
     */
    delete: boolean

    /**
     * 查看列表
     *
     * @type {boolean}
     * @memberof CLIOptions
     */
    list: boolean
  }
}

/**
 * 包管理类
 *
 * @export
 * @class PackagesCommand
 */
export class PackagesCommand {
  constructor (public options: PackagesCommand.Options) {

  }

  async delete () {
    let { name } = this.options

    if (!name) {
      log.error('[name] 名称不能为空')
      return
    }
    let pkgName = util.getRealPkgName(name)
    let pageName = util.getRealPageName(name)
    let pkgPath = config.getPath('packages', pkgName)
    let pagePath = config.getPath('pages', pageName)

    fs.removeSync(pkgPath)
    fs.removeSync(pagePath)

    log.output(LogType.DELETE, `组件 "${pkgName}"`, pkgPath)
    log.output(LogType.DELETE, `页面 "${pageName}"`, pagePath)
  }

  async list () {
    util.setLernaConfig()
    let { LsCommand } = require('lerna')
    let lsCommand = new LsCommand(['ls'], {}, config.cwd)

    lsCommand
      .run()
      .then()
  }
}

/**
 * Commander 命令行配置
 */
export default {
  name: 'packages [name]',
  alias: 'pkgs',
  usage: '[name] [-l | --list] [-d | --delete]',
  description: '管理 MinUI 组件库',
  options: [
    ['-l, --list', '查看组件列表'],
    ['-d, --delete', '删除组件']
  ],
  on: {
    '--help': () => {
      new CLIExample('packages')
        .group('列表')
        .rule('--list')
        .group('删除')
        .rule('--delete loading')
    }
  },
  async action (name: string, cliOptions: PackagesCommand.CLIOptions) {
    util.overrideNpmLog()

    let packagesCommand = new PackagesCommand({
      name
    })

    if (cliOptions.delete) { // 删除
      await packagesCommand.delete()
    } else { // 列表
      await packagesCommand.list()
    }
  }
}
