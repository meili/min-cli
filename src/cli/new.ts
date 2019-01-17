'use strict'

import * as glob from 'glob'
import * as fs from 'fs-extra'
import * as memFs from 'mem-fs'
import * as editor from 'mem-fs-editor'
import * as changeCase from 'change-case'
import * as _ from 'lodash'
import { prompt, Question, Answers } from 'inquirer'
import { CLIExample } from '../class'
import { NewType, ProjectType, ScaffoldType } from '../declare'
import util, { config, log, LogType, filterNpmScope } from '../util'
import { DevCommand } from './dev'

export namespace NewCommand {
  /**
   * 选项
   *
   * @export
   * @interface Options
   */
  export interface Options {
    /**
     * 新建类型，新建组件或页面
     *
     * @type {NewType}
     * @memberof Options
     */
    newType?: NewType

    /**
     * 名称，组件或页面的文件名称，比如“loading”
     */
    name?: string

    /**
     * 标题，组件或页面的title名称，比如“加载中”
     *
     * @type {String}
     * @memberof Options
     */
    title?: string

    /**
     * 创建后是否继续编译
     *
     * @type {boolean}
     * @memberof Options
     */
    newAfterContinueBuild?: boolean

    // /**
    //  * 基于组件，她具备插件的能力
    //  *
    //  * @type {boolean}
    //  * @memberof Options
    //  */
    // plugin: boolean
  }
}

/**
 * 新建类
 *
 * @export
 * @class NewCommand
 */
export class NewCommand {
  constructor (public options: NewCommand.Options) {
  }

  async run () {
    let { name = '', title, newType, newAfterContinueBuild } = this.options

    // 获取 answers
    let answers: NewAnswers = await getAnswers(this.options)

    // 字段做容错处理
    let defaults: NewAnswers = {
      newType,
      pkgName: util.getRealPkgName(name),
      pageName: name,
      title
    }

    answers = _.merge({}, defaults, answers)

    // 新建 组件或页面 脚手架模板
    await this.newScaffold(answers)

    // 更新主页菜单
    await this.updateHomeMenu(answers)

    // 创建组件或页面后，继续编译页面
    if (newAfterContinueBuild) {
      await this.buildPage(answers)
    }
  }

  /**
   * 新建脚手架模板
   *
   * @param {NewAnswers} answers
   */
  private async newScaffold (answers: NewAnswers) {
    let { pkgName = '', pageName = '', title = '' } = answers

    let pkgNameSuffix = util.getRealPageName(pkgName) // loading
    let date = new Date()

    // 模板变量
    let newData: NewData = {
      npmScopeStr: filterNpmScope(config.npm.scope),
      version: '1.0.0',
      pkgName, // wxc-loading
      pkgNameToPascalCase: changeCase.pascalCase(pkgName), // WxcLoading
      pkgNameSuffix, // loading
      pkgNameSuffixToPascalCase: changeCase.pascalCase(pkgNameSuffix), // Loading

      pageName, // home
      pageNameToPascalCase: changeCase.pascalCase(pageName), // Home

      title, // 组件名称
      description: `${title} - 小程序组件`, // 组件描述
      isPlugin: answers.plugin,
      time: date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate()
    }

    switch (config.projectType) {
      case ProjectType.Component: // 组件库
        {
          switch (answers.newType) {
            case NewType.Package:
              {
                // 新建组件
                await this.newPackage(newData)
              }
              break

            case NewType.Page:
              {
                // 新建页面
                await this.newPage(newData)
              }
              break

            default:
              return Promise.reject('Min New 失败：未知项目类型，无法继续创建')
          }
        }
        break

      case ProjectType.Application: // 小程序应用
        {
          // 新建页面
          await this.newPage(newData)
        }
        break

      default:
        return Promise.reject('Min New 失败：未知项目类型，无法继续创建')
    }
  }

  /**
   * 新建组件脚手架模板
   *
   * @param {NewData} newData
   */
  private async newPackage (newData: NewData) {
    let { pkgName, pkgNameSuffix } = newData
    // 内存编辑器
    const store = memFs.create()
    const fsEditor = editor.create(store)

    // package 目标地址
    let destPackagePath = util.getDestPackagePath(pkgName)

    // page 目标地址
    let destPagePath = util.getDestPagePath(pkgNameSuffix)

    // 验证 package 目标地址
    if (fs.existsSync(destPackagePath)) {
      log.output(LogType.ERROR, `创建失败，因为组件 "${pkgName}" 已经存在`, destPackagePath)
      return undefined
    }

    // 验证 page 目标地址
    if (fs.existsSync(destPagePath)) {
      log.output(LogType.ERROR, `创建失败，因为页面 "${pkgNameSuffix}" 已经存在`, destPagePath)
      return undefined
    }

    // 将 package 脚手架模板路径下的文件拷贝到 package 目标路径下
    fsEditor.copyTpl(
      util.getScaffoldPath(ScaffoldType.Package),
      destPackagePath,
      newData,
      null,
      {
        globOptions: {
          dot: true
        }
      }
    )

    // 创建并写入 package/.npmignore 文件
    // fsEditor.write(
    //   util.getDestPackagePath(pkgName, '.npmignore'),
    //   'test\n*.log\n'
    // )

    // 将 example 脚手架模板路径下的文件拷贝到 page 目标路径下
    fsEditor.copyTpl(
      util.getScaffoldPath(ScaffoldType.Example),
      destPagePath,
      newData
    )

    return new Promise((resolve, reject) => {
      // 提交编辑器信息
      fsEditor.commit(() => {
        log.newline()
        log.output(LogType.CREATE, `组件 "${pkgName}"`, destPackagePath)
        // 输入拷贝 或 新增 的日志信息
        glob.sync('**', {
          cwd: destPackagePath
        }).forEach(file => log.msg(LogType.COPY, file))
        log.msg(LogType.COMPLETE, `组件 "${pkgName}" 创建完成`)

        log.newline()
        log.output(LogType.CREATE, `示例页面 "${pkgNameSuffix}"`, destPagePath)
        // 输入拷贝 或 新增 的日志信息
        glob.sync('**', {
          cwd: destPagePath
        }).forEach(file => log.msg(LogType.COPY, file))
        log.msg(LogType.COMPLETE, `示例页面 "${pkgNameSuffix}" 创建完成`)

        resolve()
      })
    })
  }

  /**
   * 新建页面脚手架模板
   *
   * @param {NewData} newData
   */
  private async newPage (newData: NewData) {
    let { pageName } = newData

    // 内存编辑器
    const store = memFs.create()
    const fsEditor = editor.create(store)

    // page 目标地址
    let destPagePath = util.getDestPagePath(pageName)

    // 验证 page 目标地址
    if (fs.existsSync(destPagePath)) {
      log.output(LogType.ERROR, `创建失败，因为页面 "${pageName}" 已经存在`, destPagePath)
      return undefined
    }

    // 将 page 脚手架模板路径下的文件拷贝到 page 目标路径下
    fsEditor.copyTpl(
      util.getScaffoldPath(ScaffoldType.Page),
      destPagePath,
      newData
    )

    return new Promise((resolve, reject) => {
      // 提交编辑器信息
      fsEditor.commit(() => {
        log.newline()
        log.output(LogType.CREATE, `页面 "${pageName}"`, destPagePath)

        // 输入拷贝 或 新增 的日志信息
        glob.sync('**', {
          cwd: destPagePath
        }).forEach(file => log.msg(LogType.COPY, file))

        log.msg(LogType.COMPLETE, `页面 "${pageName}" 创建完成`)

        resolve()
      })
    })
  }

  /**
   * 更新主页菜单
   *
   * @param {NewAnswers} answers
   */
  private async updateHomeMenu (answers: NewAnswers) {
    if (answers.newType !== NewType.Package) {
      return
    }
    let { pkgName = '', title = '' } = answers
    let homeConfigPath = config.getPath('pages', 'home', 'config.json')
    if (!fs.existsSync(homeConfigPath)) {
      return
    }

    let homeConfigData = fs.readJsonSync(homeConfigPath)
    let pages = _.get(homeConfigData, 'menus[0].pages')
    if (_.isArray(pages)) {
      let pageName = util.getRealPageName(pkgName)
      pages.unshift({
        id: pageName,
        name: title,
        icon: '',
        code: ''
      })

      util.writeFile(homeConfigPath, JSON.stringify(homeConfigData, null, 2))
    }
  }

  /**
   * 编译页面
   *
   * @param {NewAnswers} answers
   */
  private async buildPage (answers: NewAnswers) {

    // 执行 min build 构建
    log.newline()
    log.msg(LogType.RUN, '命令：min build')
    log.msg(LogType.INFO, '编译中, 请耐心等待...')

    // let pages: string[] = []

    switch (answers.newType) {
      case NewType.Package:
        // let pkgNameSuffix = util.getRealPageName(answers.pkgName || '')
        // pages = util.pageName2Pages(`home,${pkgNameSuffix}`)
        break

      case NewType.Page:
        // pages = util.pageName2Pages(answers.pageName)
        break
    }

    let devCommand = new DevCommand({
      // pages,
      // watch: false,
      // clear: false
    })
    await devCommand.run()
  }
}

/**
 * 交互式问答
 *
 * @interface NewAnswers
 * @extends {Answers}
 */
interface NewAnswers extends Answers {
  newType?: NewType
  pkgName?: string
  pageName?: string
  title?: string
}

/**
 * 脚手架模板数据
 *
 * @interface NewData
 */
interface NewData {
  npmScopeStr: string
  version: string
  pkgName: string
  pkgNameToPascalCase: string
  pkgNameSuffix: string
  pkgNameSuffixToPascalCase: string
  pageName: string
  pageNameToPascalCase: string
  title: string
  description: string
  isPlugin: boolean
  time: string
}

/**
 * Commander 命令行配置
 */
export default {
  name: 'new [name]',
  alias: '',
  usage: '[name] [-t | --title <title>]',
  description: '新建组件或页面',
  options: [
    ['-t, --title <title>', '设置标题']
    // ['-f, --force', '强制创建覆盖已有的组件和示例'],
    // ['-p, --plugin', '创建插件，她与组件一致，但她具备插件调用能力']
  ],
  on: {
    '--help': () => {
      new CLIExample('new')
      .group('新建组件')
      .rule('loading')

      // .group('创建组件并且设置标题')
      // .rule('loading --title 加载中')

      // .group('覆盖已有的组件')
      // .rule('loading --force')

      // .group('创建插件')
      // .rule('loading --plugin')
    }
  },
  async action (name: string = '', options: NewCommand.Options) {
    _.merge(options, {
      name,
      newAfterContinueBuild: true
    })

    let newCommand = new NewCommand(options)
    await newCommand.run()
  }
}

/**
 * 获取命令行交互式问答
 *
 * @param {NewCommand.Options} options
 * @returns {Promise<NewAnswers>}
 */
function getAnswers (options: NewCommand.Options): Promise<NewAnswers> {
  let { name = '', title = '', newType = '' } = options
  let { projectType, prefix, prefixStr } = config

  const CREATE_QUESTIONS: Question[] = [
    {
      type: 'list',
      message: '请选择新建类型',
      name: 'newType',
      choices: () => {
        return [{
          name: '新建组件',
          value: NewType.Package
        }, {
          name: '新建页面',
          value: NewType.Page
        }]
      },
      when (answers: any) {
        // for 组件库
        return !newType && projectType === ProjectType.Component
      }
    }, {
      type: 'input',
      message: '请设置新组件的英文名称',
      name: 'pkgName',
      filter (input: string) {
        input = input.trim()
        return util.getRealPkgName(input)
      },
      validate (input: string, answers: any) {
        if (input === '') {
          return '请输入名称'
        } else if (input === prefixStr) {
          return `格式不正确，例如输入'loading' 或 '${prefixStr}loading'`
        } else if (/^-/.test(input)) {
          return '格式不正确，不能以“-”开始'
        } else if (/-$/.test(input)) {
          return '格式不正确，不能以“-”结束'
        } else if (/[^a-z-]+/.test(input)) {
          return `格式不正确，只能是小写字母，支持“-”分隔`
        }
        return true
      },
      when (answers: any) {
        let $newType = answers.newType || newType
        // for new package
        return $newType === NewType.Package && (!name || name === '-' || name === prefix || name === prefixStr)
      }
    }, {
      type: 'input',
      message: '请设置新组件的中文标题',
      name: 'title',
      filter (input: string) {
        return input.trim()
      },
      validate (input: string, answers: any) {
        if (input === '') {
          return '请输入标题'
        }
        return true
      },
      when (answers: any) {
        let $newType = answers.newType || newType
        // for new package
        return $newType === NewType.Package && !title
      }
    }, {
      type: 'input',
      message: '请设置新页面的英文名称',
      name: 'pageName',
      filter (input: string) {
        return input.trim()
      },
      validate (input: string, answers: any) {
        if (input === '') {
          return '请输入名称'
        }
        return true
      },
      when (answers: any) {
        let $newType = answers.newType || newType
        // for new page
        return ($newType === NewType.Page || projectType === ProjectType.Application) && !name
      }
    }, {
      type: 'input',
      message: '请设置新页面的中文标题',
      name: 'title',
      filter (input: string) {
        return input.trim()
      },
      validate (input: string, answers: any) {
        if (input === '') {
          return '请输入标题'
        }
        return true
      },
      when (answers: any) {
        let $newType = answers.newType || newType
        // for new page
        return ($newType === NewType.Page || projectType === ProjectType.Application) && !title
      }
    }
  ]

  return prompt(CREATE_QUESTIONS)
}
