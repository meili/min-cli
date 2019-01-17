'use strict'

import * as fs from 'fs-extra'
import * as path from 'path'
import * as glob from 'glob'
import * as _ from 'lodash'
import * as changeCase from 'change-case'
import { prompt, Question } from 'inquirer'
import * as memFs from 'mem-fs'
import * as editor from 'mem-fs-editor'
import { CLIExample } from '../class'
import { ScaffoldType, ProjectType, NewType } from '../declare'
import util, { config, defaultConfig, exec, log, LogType, filterPrefix, filterNpmScope } from '../util'
import { NewCommand } from './new'

export namespace InitCommand {
  /**
   * 选项
   *
   * @export
   * @interface Options
   */
  export interface Options {
    /**
     * 项目名称
     *
     * @type {string}
     * @memberof Options
     */
    proName: string

    /**
     * 项目路径
     *
     * @type {string}
     * @memberof Options
     */
    proPath: string

    /**
     * 项目类型
     *
     * @type {ProjectType}
     * @memberof Options
     */
    projectType: ProjectType

    /**
     * 项目类型-中文
     *
     * @type {('组件库' | '小程序')}
     * @memberof Options
     */
    projectTypeTitle: '组件库' | '小程序'

    /**
     * 项目标题
     *
     * @type {string}
     * @memberof Options
     */
    title: string

    /**
     * 小程序AppId
     *
     * @type {string}
     * @memberof Options
     */
    appId?: string

    /**
     * 项目描述
     *
     * @type {string}
     * @memberof Options
     */
    description?: string

    /**
     * 组件前缀
     *
     * @type {string}
     * @memberof Options
     */
    prefix?: string

    /**
     * 带上 '-' 完整的组件前缀，例如 wxc-
     *
     * @type {string}
     * @memberof Options
     */
    prefixStr?: string

    /**
     * 是否使用全局变量
     *
     * @type {boolean}
     * @memberof Options
     */
    useGlobalStyle: boolean

    /**
     * 是否使用全局模板
     *
     * @type {boolean}
     * @memberof Options
     */
    useGlobalLayout?: boolean

    /**
     * 项目编译后的保存路径
     *
     * @type {string}
     * @memberof Options
     */
    dest: string

    /**
     * NPM模块编译后的保存路径
     *
     * @type {string}
     * @memberof Options
     */
    npmDest?: string

    /**
     * NPM模块的scope名称
     *
     * @type {string}
     * @memberof Options
     */
    npmScope?: string

    /**
     * 带上 '@' 完整的 scope 名称，例如 @minui
     *
     * @type {string}
     * @memberof Options
     */
    npmScopeStr?: string

    /**
     * GIT仓库地址
     *
     * @type {string}
     * @memberof Options
     */
    gitUrl?: string

    /**
     * Author
     *
     * @type {string}
     * @memberof Options
     */
    author?: string

    /**
     * 初始化项目后，是否继续创建组件
     *
     * @type {boolean}
     * @memberof Options
     */
    initAfterContinueNewPackage?: boolean
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
 * 初始化类
 *
 * @export
 * @class InitCommand
 */
export class InitCommand {
  constructor (public options: InitCommand.Options) {

  }

  async run () {
    let { dest, initAfterContinueNewPackage } = this.options

    // 拷贝 脚手架模板
    await this.copyScaffold()

    await this.updateConfig()

    if (initAfterContinueNewPackage) {
      await this.newPackage()
    }

    await this.npmInstall()

    await this.minBuild()

    // 提示使用
    log.newline()
    log.msg(LogType.TIP, `项目创建完成，请在 "微信开发者工具" 中新建一个小程序项目，项目目录指向新建工程里的 ${dest}/ 文件夹。如此，组件就能在开发者工具中进行预览了`)
  }

  private async copyScaffold (): Promise<any> {
    const { proName, proPath, projectType, projectTypeTitle } = this.options

    // 内存编辑器
    const store = memFs.create()
    const fsEditor = editor.create(store)

    // 拷贝 project.common 脚手架模板
    fsEditor.copyTpl(
      util.getScaffoldPath(ScaffoldType.Project, 'common'),
      proPath,
      this.options,
      null,
      {
        globOptions: {
          dot: true
        }
      }
    )

    // 拷贝 project.type 脚手架模板
    fsEditor.copyTpl(
      util.getScaffoldPath(ScaffoldType.Project, projectType),
      proPath,
      this.options
    )

    return new Promise((resolve, reject) => {
      // 保存
      fsEditor.commit(() => {
        log.newline()
        log.msg(LogType.CREATE, `项目 "${proName}" in "${proPath}"`)

        // 输入拷贝 或 新增 的日志信息
        let files = glob.sync('**', {
          cwd: proPath
        })
        files.forEach(file => log.msg(LogType.COPY, file))

        log.msg(LogType.COMPLETE, `"${projectTypeTitle}"项目已创建完成`)
        resolve()
      })
    })
  }

  private async updateConfig () {
    let { options } = this
    // 更新CONFIG.CWD
    config.update({
      cwd: options.proPath,
      projectType: options.projectType,
      prefix: options.prefix,
      title: options.title,
      dest: options.dest,
      npm: {
        dest: options.npmDest,
        scope: options.npmScope
      }
    })
  }

  private async newPackage () {
    let { projectType } = this.options
    if (projectType !== ProjectType.Component) {
      return
    }

    // 执行 min new 创建
    log.newline()
    log.msg(LogType.INFO, '准备为您创建一个新的组件')
    log.msg(LogType.RUN, '命令：min new')
    let newCommand = new NewCommand({
      newType: NewType.Package
    })
    await newCommand.run()
  }

  private async npmInstall () {
    let { proPath } = this.options
    // 执行 npm install
    log.newline()
    log.msg(LogType.RUN, '命令：npm install')
    log.msg(LogType.INFO, '安装中, 请耐心等待...')
    await exec('npm', ['install'], true, {
      cwd: proPath
    })
  }

  private async minBuild () {
    let { proPath } = this.options
    // 执行 min build 构建
    log.newline()
    log.msg(LogType.RUN, '命令：min build')
    log.msg(LogType.INFO, '编译中, 请耐心等待...')
    await exec('min', ['build'], true, {
      cwd: proPath
    })
  }
}

/**
 * Commander 命令行配置
 */
export default {
  name: 'init [name]',
  alias: '',
  usage: '[name]',
  description: '创建项目',
  options: [],
  on: {
    '--help': () => {
      new CLIExample('init')
        .group('create project')
        .rule('')
    }
  },
  async action (proName: string, cliOptions: InitCommand.CLIOptions) {
    try {
      // 获取 answers
      let options = await getOptions(proName)

      // 项目名称为空，从路径里获取文件名
      proName = proName || path.basename(options.proPath)

      let projectTypeTitle = getProjectTypeTitle(options.projectType)

      // 字段做容错处理
      let defaults = {
        proName,
        proNameToCamelCase: changeCase.camelCase(proName),
        title: defaultConfig.title,
        appId: 'touristappid',
        description: `${options.title || defaultConfig.title}-${projectTypeTitle}`,
        prefix: defaultConfig.prefix,
        useExample: options.projectType === ProjectType.Component ? true : false,
        useGlobalStyle: true,
        useGlobalLayout: options.projectType === ProjectType.Application ? true : false,
        dest: defaultConfig.dest,
        npmScope: '',
        npmDest: defaultConfig.npm.dest,
        gitUrl: '',
        author: ''
      }

      options = _.merge(defaults, options, {
        prefixStr: filterPrefix(options.prefix),
        npmScopeStr: filterNpmScope(options.npmScope),
        projectTypeTitle,
        options: {
          ProjectType
        },
        initAfterContinueNewPackage: true
      })

      let initCommand = new InitCommand(options)
      await initCommand.run()

    } catch (err) {
      log.error(err)
    }
  }
}

function getOptions (proName: string): Promise<InitCommand.Options> {
  const CREATE_QUESTIONS: Question[] = [
    {
      type: 'input',
      message: '请设置项目目录',
      name: 'proPath',
      default (answers: any) {
        return util.getDestProjectPath(proName || '')
      },
      filter (input: string) {
        return input.trim()
      },
      validate (input: string, answers: any) {
        if (input === '') {
          return '请输入项目目录'
        }

        if (!path.isAbsolute(input)) {
          return `格式不正确，请更换绝对路径`
        }

        if (fs.existsSync(input) && glob.sync('**', { cwd: input }).length > 0 ) {
          return `不是空目录，请更换`
        }
        return true
      }
    }, {
      type: 'list',
      message: '请选择项目类型',
      name: 'projectType',
      default: ProjectType.Application,
      choices: () => {
        return [{
          name: '新建小程序',
          value: ProjectType.Application
        }, {
          name: '新建组件库',
          value: ProjectType.Component
        }]
      }
    }, {
      type: 'confirm',
      message: '是否继续高级设置',
      name: 'isContinue',
      default: true
    }, {
      type: 'input',
      message: '请设置项目标题',
      name: 'title',
      default: defaultConfig.title,
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
        return !!answers.isContinue
      }
    }, {
      type: 'input',
      message: '请设置小程序AppId',
      name: 'appId',
      default: 'touristappid',
      filter (input: string) {
        return input.trim()
      },
      when (answers: any) {
        return !!answers.isContinue
      }
    }, {
      type: 'input',
      message: '请设置项目描述',
      name: 'description',
      default (answers: any) {
        let projectTypeTitle = getProjectTypeTitle(answers.projectType)
        return `${answers.title}-${projectTypeTitle}`
      },
      when (answers: any) {
        return !!answers.isContinue
      }
    }, {
      type: 'input',
      message: '请设置组件名前缀',
      name: 'prefix',
      default (answers: any) {
        return defaultConfig.prefix.replace(/[-]+$/, '')
      },
      filter (input: string) {
        return input.trim()
      },
      validate (input: string, answers: any) {
        if (input === '') {
          return '请输入组件名前缀'
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
        return !!answers.isContinue && answers.projectType === ProjectType.Component
      }
    }, /* {
      type: 'confirm',
      message: '是否使用系统自带的Example组件（编写组件Demo示例和Api文档）',
      name: 'useExample',
      default: true,
      when (answers: any) {
        return !!answers.isContinue && answers.projectType === ProjectType.Component
      }
    }, */ {
      type: 'confirm',
      message: '是否使用全局变量',
      name: 'useGlobalStyle',
      default: true,
      when (answers: any) {
        return !!answers.isContinue
      }
    }, {
      type: 'confirm',
      message: '是否使用全局模板',
      name: 'useGlobalLayout',
      default: true,
      when (answers: any) {
        return !!answers.isContinue && answers.projectType === ProjectType.Application
      }
    }, {
      type: 'input',
      message: '请设置项目编译后的保存路径',
      name: 'dest',
      default: defaultConfig.dest,
      filter (input: string) {
        return input.trim()
      },
      validate (input: string, answers: any) {
        if (input === '') {
          return '请输入路径'
        }
        return true
      },
      when (answers: any) {
        return !!answers.isContinue
      }
    }, {
      type: 'input',
      message: '请设置NPM模块编译后的保存路径，相对于 “项目编译” 后的保存路径',
      name: 'npmDest',
      default (answers: any) {
        // dist/packages => packages
        return defaultConfig.npm.dest.replace(`${defaultConfig.dest}/`, '')
      },
      filter (input: string) {
        input = input.trim()
        if (input !== '') {
          // 由于 @types/inquirer v0.0.35 版本未提供 filter 函数第二个answers入参，但 inquirer 包已支持，因此在这里通过 arguments 得到入参集合
          let answers = arguments[1] || {}
          // dist + packages => dist/packages
          return `${answers.dest}/${input}`
        }
        return input
      },
      validate (input: string, answers: any) {
        if (input === '') {
          return '请输入路径'
        }
        return true
      },
      when (answers: any) {
        return !!answers.isContinue && answers.projectType === ProjectType.Component
      }
    }, {
      type: 'input',
      message: '请设置NPM模块的scope名称',
      name: 'npmScope',
      filter (input: string) {
        return input.trim()
      },
      validate (input: string, answers: any) {
        if (input !== '') {
          if (!input.startsWith('@')) {
            return `格式不正确，请以"@"符号开始，比如${defaultConfig.npm.scope}`
          } else if (input.endsWith('/')) {
            return `格式不正确，请勿以"/"结束，比如${defaultConfig.npm.scope}`
          }
        }
        return true
      },
      when (answers: any) {
        return !!answers.isContinue && answers.projectType === ProjectType.Component
      }
    }, {
      type: 'input',
      message: '请设置GIT仓库地址',
      name: 'gitUrl',
      when (answers: any) {
        return !!answers.isContinue
      }
    }, {
      type: 'input',
      message: '请设置Author',
      name: 'author',
      default: process.env.USER,
      when (answers: any) {
        return !!answers.isContinue
      }
    }
  ]

  return prompt(CREATE_QUESTIONS) as Promise<InitCommand.Options>
}

function getProjectTypeTitle (projectType: ProjectType) {
  switch (projectType) {
    case ProjectType.Component:
      return '组件库'

    case ProjectType.Application:
      return '小程序'

    default:
      throw new Error('未知项目类型')
  }
}
