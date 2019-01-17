'use strict'

import * as _ from 'lodash'
import { prompt, Question } from 'inquirer'
import { CLIExample } from '../class'
import util, { config, log } from '../util'

export namespace PublishCommand {
  /**
   * 选项
   *
   * @export
   * @interface Options
   */
  export interface Options {
    /**
     * 包名 或 组件名，如：@minui/wxc-loading 或 wxc-loading
     *
     * @type {string}
     * @memberof Options
     */
    pkgName?: string

    /**
     * lerna 自定义配置选项
     *
     * @type {Object}
     * @memberof Options
     */
    lernaOptions?: Object
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
 * 发布类
 *
 * @export
 * @class PublishCommand
 */
export class PublishCommand {
  constructor (public options: PublishCommand.Options) {
  }

  async run () {
    let { pkgName, lernaOptions = {} } = this.options
    let publishArgs = {
      exact: true,
      message: 'Publish by MinDev'
    }

    if (pkgName) {
      let pkgInfo = getPackages().find((item: any) => item.name === pkgName)

      if (pkgInfo) { // 组件名
        _.merge(publishArgs, {
          scope: pkgInfo.name
        })
      } else {
        log.error(`没有找到组件 ${pkgName}`)
        return
      }
    }

    // lerna 自定义配置选项
    if (_.isObject(lernaOptions)) {
      _.merge(publishArgs, lernaOptions)
    }

    util.setLernaConfig()

    let { PublishCommand } = require('lerna')
    let publishCommand = new PublishCommand(['publish'], publishArgs, config.cwd)

    publishCommand
      .run()
      .then()
  }
}

/**
 * Commander 命令行配置
 */
export default {
  name: 'publish [name]',
  alias: 'pub',
  usage: '[name]',
  description: '发布组件',
  options: [],
  on: {
    '--help': () => {
      new CLIExample('publish')
        .group('发布')
        .rule('')
    }
  },
  async action (pkgName: string, cliOptions: PublishCommand.CLIOptions) {
    util.overrideNpmLog()

    // loading => @minui/wxc-loading
    // wxc-loading => @minui/wxc-loading
    pkgName = pkgName ? util.getRealPkgNameWithScope(pkgName) : ''

    // 获取 answers
    let options = await getOptions(pkgName)

    // 字段做容错处理
    let defaults = {
      pkgName
    }

    options = _.merge(defaults, options)

    let publishCommand = new PublishCommand(options)
    await publishCommand.run()
  }
}

function getOptions (pkgName: string): Promise<PublishCommand.Options> {
  const CREATE_QUESTIONS: Question[] = [
    {
      type: 'list',
      message: '请选择发布方式',
      name: 'mode',
      default: '0',
      choices: () => {
        return [{
          name: '手动选择要发布的组件',
          value: '0'
        }, {
          name: '发布项目里的每个组件',
          value: '1'
        }]
      },
      when (answers: any) {
        return !pkgName
      }
    }, {
      type: 'list',
      message: '请选择要发布的组件',
      name: 'pkgName',
      choices: () => {
        return getPackages().map((pkg: {name: string, version: string}, index: number) => {
          return {
            name: pkg.name + ' @' + pkg.version,
            value: pkg.name
          }
        })
      },
      when (answers: any) {
        return answers.mode === '0'
      }
    }
  ]

  return prompt(CREATE_QUESTIONS)
}

function getPackages () {
  let PackageUtilities = require('lerna/lib/PackageUtilities')

  return PackageUtilities.getPackages({
    packageConfigs: util.getLernaPackageConfigs(),
    rootPath: config.cwd
  })

  // .map((pkg: any) => {
  //   return {
  //     name: pkg.name,
  //     version: pkg.version ? chalk.grey(`v${pkg.version}`) : chalk.yellow('MISSING'),
  //     private: pkg.isPrivate() ? `(${chalk.red('private')})` : ''
  //   }
  // })
}

// 编译 packages 组件库

// let packageNames: string[] = [] //['loading'].map(name => util.getFullPackageName(name))
// let xcx = new Xcx({
//   isClear: true,
//   packageNames,
//   traverse: {
//     enter (xcxNode: XcxNode) {
//       xcxNode.save()
//     }
//   }
// })
// xcx.compilePackages()
