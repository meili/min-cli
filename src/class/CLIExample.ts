import { config } from '../util'

/**
 * CLI 示例类
 *
 * @export
 * @class CLIExample
 */
export class CLIExample {
  command: string

  /**
   * Creates an instance of CLIExample.
   * @param {string} command 命令行名称
   * @memberof CLIExample
   */
  constructor (command: string) {
    this.command = command
    console.log('')
    console.log('  Examples:')
  }

  /**
   * 分组
   *
   * @param {string} group 组名称
   * @returns
   * @memberof CLIExample
   */
  group (group: string) {
    console.log(`\n    ${group}\n`)
    return this
  }

  /**
   * 规则
   *
   * @param {string} rule 规则名称
   * @param {string} [comment] 规则说明
   * @returns
   * @memberof CLIExample
   */
  rule (rule: string, comment?: string) {
    console.log(`      $ ${config.cli} ${this.command} ${rule}${comment ? `\t# ${comment}` : ''}`)
    return this
  }
}
