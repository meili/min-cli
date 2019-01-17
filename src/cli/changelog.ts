import { CLIExample } from '../class'
import { log } from '../util'

export namespace ChangelogCommand {
  /**
   * 选项
   *
   * @export
   * @interface Options
   */
  export interface Options {}

  /**
   * CLI选项
   *
   * @export
   * @interface CLIOptions
   */
  export interface CLIOptions {}
}

/**
 * 日志类
 *
 * @export
 * @class ChangelogCommand
 */
export class ChangelogCommand {
  constructor (public options: ChangelogCommand.Options = {}) {

  }

  async run () {
    const standardVersion = require('standard-version')

    // 生成 CHANGELOG.md 更新日志文档
    standardVersion({
      noVerify: true,
      infile: 'CHANGELOG.md',
      silent: true
    }, function (err: Error) {
      if (err) {
        log.error(`changelog failed with message: ${err.message}`)
      }
    })
  }
}

/**
 * Commander 命令行配置
 */
export default {
  name: 'changelog',
  alias: 'log',
  usage: '',
  description: '更新日志',
  options: [],
  on: {
    '--help': () => {
      new CLIExample('changelog')
        .group('更新日志')
        .rule('')
    }
  },
  async action (cliOptions: ChangelogCommand.CLIOptions) {
    let changelogCommand = new ChangelogCommand()
    await changelogCommand.run()
  }
}
