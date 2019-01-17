import { prompt, Question } from 'inquirer'
import * as _ from 'lodash'
import { config, customConfig, exec, log, LogType } from '../util'

export namespace BabelES6 {
  export interface Options {

  }

  export function getQuestion (options: Options = {}): Question[] {
    return [
      {
        type: 'confirm',
        message: '是否启用 ES6 转 ES5',
        name: 'BabelES6',
        default: true,
        when (answers: any) {
          return !customConfig.compilers || ('babel' in customConfig.compilers === false)
        }
      }
    ]
  }

  export async function setAnswer (options: Options = {}) {
    let questions = getQuestion(options)
    let answers = await prompt(questions)
    let { BabelES6 } = answers

    if (_.isUndefined(BabelES6)) {
      return
    }

    if (!BabelES6) {
      config.updateCustomFile({
        compilers: {
          babel: false
        }
      })
      return
    }

    config.updateCustomFile({
      compilers: {
        babel: {
          sourceMaps: 'inline',
          presets: [
            'env'
          ],
          plugins: [
            'syntax-export-extensions',
            'transform-class-properties',
            'transform-decorators-legacy',
            'transform-export-extensions'
          ]
        }
      }
    })

    // babel
    let devDependencies = [
      'babel-plugin-syntax-export-extensions',
      'babel-plugin-transform-class-properties',
      'babel-plugin-transform-decorators-legacy',
      'babel-plugin-transform-export-extensions',
      'babel-preset-env'
    ]

    log.msg(LogType.RUN, `npm install ${devDependencies.join(',')} --save`)
    log.newline()

    // run npm install
    await exec('npm', ['install', ...devDependencies, '--save'], true, {
      cwd: config.cwd
    })
  }
}
