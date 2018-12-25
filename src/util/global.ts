import * as fs from 'fs-extra'
import * as path from 'path'
import * as _ from 'lodash'
import { WxSFMScript, Request } from '../class'
import { config, dom, log, LogType } from '../util'

type StyleType = 'Less' | 'Pcss'

export namespace Global {

  export interface StyleConfig {
    [key: string]: string
  }

  export interface Style {
    config: StyleConfig
    lessCode: string
    pcssCode: string
  }

  export interface Config {
    style: Style
  }

  export interface Layout {
    app: {
      template: string,
      usingComponents: {
        [key: string]: string
      }
    }
  }

  export interface AppConfig {
    [key: string]: any
  }
}

/**
 * 全局类
 *
 * @export
 * @class Global
 */
export class Global {
  // dev [name]
  // https://meili.github.io/min/docs/min-cli/wxc-project/dev/index.html
  static _isDebug: boolean
  // 只要是 dev 命令即 dev 模式, 与 debug 模式区分开
  static _isDev: boolean
  static _pages: string[] = []
  static _global: Global

  /**
   * 全局配置
   *
   * @type {Global.Config}
   * @memberof Global
   */
  config: Global.Config

  /**
   * 全局布局
   *
   * @type {Global.Layout}
   * @memberof Global
   */
  layout: Global.Layout

  /**
   * 全局 App 配置
   *
   * @type {Global.AppConfig}
   * @memberof Global
   */
  appConfig: Global.AppConfig

  constructor () {
    this.setConfig()
    this.setApp()
  }

  static clear () {
    this._pages = []
    this._global = new Global()
  }

  static get global () {
    return this._global = this._global || new Global()
  }

  static get isDebug () {
    return this._isDebug
  }

  static set isDebug (value: boolean) {
    this._isDebug = value
  }

  static get isDev () {
    return this._isDev
  }

  static set isDev (value: boolean) {
    this._isDev = value
  }

  static get config () {
    return this.global.config
  }

  static get layout () {
    return this.global.layout
  }

  static get appConfig () {
    return this.global.appConfig
  }

  static get appPages () {
    return this.appConfig.pages || []
  }

  static get appTabBarList (): any[] {
    let { tabBar = { list: [] } } = this.appConfig
    let { list = [] } = tabBar
    return list
  }

  static addDevTabBar (tabBarList: any[], devPage: string) {
    let devSeps = devPage.split('/')
    let devName = devSeps[devSeps.length - 2]
    let iconPath = 'assets/tab/dev.png'
    let selectedIconPath = 'assets/tab/dev_hl.png'
    tabBarList.unshift({
      pagePath: devPage,
      iconPath,
      selectedIconPath,
      text: `<${devName}/>`
    })
    fs.copySync(path.join(__dirname, '../../scaffold', iconPath), config.getPath('dest', iconPath))
    fs.copySync(path.join(__dirname, '../../scaffold', selectedIconPath), config.getPath('dest', selectedIconPath))
  }

  static saveAppConfig (pages: string[], isDelete?: boolean) {
    let { _pages } = this
    if (isDelete) {
      let remove = _.remove(_pages, (page) => {
        return _.indexOf(pages, page) !== -1
      })
      if (remove.length === 0) {
        return
      } else {
        pages = _pages // 删除后的 pages
      }
    } else {
      let merge = _.union(_pages, pages)
      let isSame = merge.length === _pages.length
      if (isSame) {
        return
      } else {
        pages = merge // 合并过的 pages
      }
    }

    if (pages.length === 0) {
      return
    }

    let appConfig = _.cloneDeep(this.appConfig)
    let tabBarList = _.cloneDeep(this.appTabBarList)
    let homePage = ''

    if (this.isDebug) {
      homePage = pages[0]
      if (tabBarList.length > 0 && _.indexOf(tabBarList, homePage) === -1) {
        this.addDevTabBar(tabBarList, homePage)
      }
    } else if (tabBarList.length > 0) {
      homePage = tabBarList[0].pagePath
    } else {
      homePage = config.homePage
    }

    if (_.indexOf(pages, homePage) !== -1) {
      pages = pages.filter((page) => page !== homePage)
      pages.unshift(homePage)
    } else {
      log.error(`找不到默认首页：${homePage}`)
    }

    if (tabBarList.length > 0) {
      appConfig.tabBar.list = tabBarList
    }

    this._pages = pages
    appConfig.pages = pages
    appConfig = _.omit(appConfig, 'usingComponents')

    let appConfigCont = JSON.stringify(appConfig, null, 2)
    let appConfigPath = config.getPath('dest', 'app.json')

    // 日志
    log.msg(LogType.GENERATE, path.relative(config.cwd, appConfigPath))

    // 写入
    fs.writeFileSync(appConfigPath, appConfigCont, 'utf8')
  }

  /**
   * 设置全局配置
   *
   * @private
   * @memberof Global
   */
  private setConfig () {
    let file = path.join(config.cwd, config.filename)
    let configData = fs.existsSync(file) ? fs.readJsonSync(file) : {}
    let { style: styleConfig = {} } = configData
    let lessCode = this.generateStyleVariables(styleConfig, 'Less')
    let pcssCode = this.generateStyleVariables(styleConfig, 'Pcss')
    this.config = {
      style: {
        config: configData,
        lessCode,
        pcssCode
      }
    }
  }

  /**
   * 全局 Style 变量生成
   *
   * @private
   * @param {Global.StyleConfig} styleConfig
   * @param {StyleType} styleType
   * @returns
   * @memberof Global
   */
  private generateStyleVariables (styleConfig: Global.StyleConfig, styleType: StyleType) {
    let map: string[] = []
    let httpRegExp = /^https?:\/\/(([a-zA-Z0-9_-])+(\.)?)*(:\d+)?(\/((\.)?(\?)?=?&?[a-zA-Z0-9_-](\?)?)*)*$/i
    let symbol = ''
    switch (styleType) {
      case 'Less':
        symbol = '@'
        break
      case 'Pcss':
        symbol = '$'
        break
      default:
        throw new Error('没有找到StyleType类型')
    }
    _.forIn(styleConfig, (value, key) => {
      if (httpRegExp.test(value)) {
        value = `'${value}'`
      }
      map.push(`${symbol}${key}: ${value};`)
    })
    return map.join('\n')
  }

  /**
   * 设置 全局 App 模板布局、模板组件 和 App.config 配置
   *
   * @private
   * @memberof Global
   */
  private setApp () {
    let request = new Request({
      request: `./app${config.ext.wxa}`,
      parent: config.getPath('src'),
      isMain: true
    })

    let template = ''
    let appConfig = {}
    let usingComponents = {}

    if (request.src) {
      let source = fs.readFileSync(request.src, 'utf-8')

      // 单文件组合
      let {
        script: { code: scriptCode, compileType: scriptCompileType },
        template: { code: templateCode }
      } = dom.getSFC(source)

      // script模块
      let wxSFMScript = new WxSFMScript(scriptCode, request, {
        compileType: scriptCompileType
      })

      template = templateCode
      usingComponents = wxSFMScript.getUsingComponents()
      appConfig = wxSFMScript.getConfig()
    }

    // 全局布局
    this.layout = {
      app: {
        template,
        usingComponents
      }
    }

    // 全局 App 配置
    this.appConfig = appConfig
  }
}
