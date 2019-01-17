import * as path from 'path'
import { prompt, Question } from 'inquirer'
import { config, customConfig } from '../util'

export namespace NpmDest {
  export interface Options {

  }

  export function getQuestion (options: Options = {}): Question[] {
    return [
      {
        type: 'input',
        message: '请设置安装路径',
        name: 'npmDest',
        default: config.npm.dest,
        validate (input: string, answers: any) {
          if (!input || !input.trim()) {
            return '路径不能为空'
          } else if (path.isAbsolute(input) || input.charAt(0) === '.') {
            return '路径格式错误，相对于项目根目录下，例如：components 或 dist/packages'
          }
          return true
        },
        filter (input: string) {
          return input.split(path.sep).join('/')
        },
        when (answers: any) {
          return !customConfig.npm || !customConfig.npm.dest
        }
      }
    ]
  }

  export async function setAnswer (options: Options = {}) {
    let questions = getQuestion(options)
    let answers = await prompt(questions)

    if (answers.npmDest) {
      config.updateCustomFile({
        npm: {
          dest: answers.npmDest
        }
      })
    }
  }
}
