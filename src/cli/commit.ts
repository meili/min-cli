import * as path from 'path'
import { CLIExample } from '../class'
import { execFileSync } from 'child_process'

export namespace CommitCommand {
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
 * 提交信息类
 *
 * @export
 * @class CommitCommand
 */
export class CommitCommand {
  constructor (public options: CommitCommand.Options = {}) {

  }

  async run () {
    execFileSync(path.join(__dirname, '../../node_modules/.bin/git-cz'), {
      stdio: ['inherit', 'inherit', 'inherit']
    })
  }
}

/**
 * Commander 命令行配置
 */
export default {
  name: 'commit',
  alias: 'ci',
  usage: '',
  description: '提交 MinUI 组件库',
  options: [],
  on: {
    '--help': () => {
      new CLIExample('commit')
        .group('提交')
        .rule('')
    }
  },
  async action (cliOptions: CommitCommand.CLIOptions) {
    let commitCommand = new CommitCommand()
    await commitCommand.run()
  }
}
