import * as fs from 'fs-extra'
import * as path from 'path'
import * as _ from 'lodash'
import { Request } from '../class'
import { BaseScript, WxaScript } from '../class/m-script'
import { config, dom, log, LogType, xcxNext } from '../util'
import core from '@mindev/min-core'

interface SymbolExpression {
  name: string
  exp: string
}

export interface SubPackage {
  root: string
  pages: string[]
}

const SymbolType: {
  [key: string]: SymbolExpression
} = {
  // @w: 100px
  AT: {
    name: '@',
    exp: ':'
  }, // less

  // $w: 100px
  Dollar: {
    name: '$',
    exp: ':'
  }, // postcss、sass

  // font-size = 14px
  None: {
    name: '',
    exp: '='
  } // stylus
}

export namespace Global {

  export interface StyleConfig {
    [key: string]: string
  }

  export interface Style {
    config: StyleConfig
    withAtSymbolVariables: string
    withDollarSymbolVariables: string
    noWithSymbolVariables: string
    // lessCode: string
    // pcssCode: string
  }

  export interface Config {
    style: Style
  }

  export interface Layout {
    app: {
      request: Request,
      template: string,
      usingComponents: BaseScript.UsingComponents
    }
  }

  export interface AppConfig {
    [key: string]: any
    pages?: string[]
    subPackages?: SubPackage[]
  }
}

/**
 * 全局类
 *
 * @export
 * @class Global
 */
export class Global {
  static _isDebug: boolean
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

  static get appSubPackages (): SubPackage[] {
    let { subPackages = [] } = this.appConfig
    return subPackages.map(sPackage => {
      if (_.isString(sPackage)) {
        return {
          root: sPackage,
          pages: []
        }
      } else if (_.isPlainObject(sPackage)) {
        return _.merge(sPackage, {
          pages: []
        })
      }
    })
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

    this._pages = _.cloneDeep(pages)

    let appConfig = _.cloneDeep(this.appConfig)
    let tabBarList = _.cloneDeep(this.appTabBarList)
    let homePage = ''

    let subPackages = _.cloneDeep(this.appSubPackages)

    subPackages.forEach(sPackage => {
      let sPages = []
      let sRoot = sPackage.root

      sRoot += sRoot.lastIndexOf('/') === -1 ? '/' : ''
      pages = pages.filter(page => {
        if (page.indexOf(sRoot) === 0) {
          sPages.push(path.relative(sRoot, page))
          return false
        }
        return true
      })

      sPackage.pages = sPages
    })

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

    if (homePage && _.indexOf(pages, homePage) !== -1) {
      pages = pages.filter((page) => page !== homePage)
      pages.unshift(homePage)
    }

    if (tabBarList.length > 0) {
      appConfig.tabBar.list = tabBarList
    }

    if (subPackages.length > 0) {
      appConfig.subPackages = subPackages
    }

    let originRoutes = config.originRoutes ? config.originRoutes () : []

    // this._pages = pages
    appConfig.pages = _.union(pages, originRoutes)
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
    let filePath = path.join(config.cwd, config.filename)
    let configData = {
      style: {}
    }

    if (fs.existsSync(filePath)) {
      delete require.cache[filePath]
      configData = require(filePath)
    }
    let { style: styleConfig = {} } = configData

    this.config = {
      style: {
        config: styleConfig,
        withAtSymbolVariables: this.generateStyleVariables(styleConfig, SymbolType['AT']),
        withDollarSymbolVariables: this.generateStyleVariables(styleConfig, SymbolType['Dollar']),
        noWithSymbolVariables: this.generateStyleVariables(styleConfig, SymbolType['None'])
      }
    }
  }

  /**
   * 全局 Style 变量生成
   *
   * @private
   * @param {Global.StyleConfig} styleConfig
   * @param {SymbolExpression} symbolExpression
   * @returns
   * @memberof Global
   */
  private generateStyleVariables (styleConfig: Global.StyleConfig, symbolExpression: SymbolExpression) {
    let map: string[] = []
    let httpRegExp = /^https?:\/\/(([a-zA-Z0-9_-])+(\.)?)*(:\d+)?(\/((\.)?(\?)?=?&?[a-zA-Z0-9_-](\?)?)*)*$/i
    let { name: symbolName, exp: symbolExp} = symbolExpression

    _.forIn(styleConfig, (value, key) => {
      if (httpRegExp.test(value)) {
        value = `'${value}'`
      }
      map.push(`${symbolName}${key}${symbolExp} ${value};`)
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
        script,
        template: { code: templateCode }
      } = dom.getSFC(source)

      try {
        // script模块
        let wxaScript = new WxaScript(script.code, request, {
          lang: script.lang
        })

        template = templateCode
        usingComponents = wxaScript.getUsingComponents()
        appConfig = wxaScript.getConfig()
      } catch (err) {
        core.util.error(err)
        xcxNext.add(request)
      }
    }

    // 全局布局
    this.layout = {
      app: {
        request,
        template,
        usingComponents
      }
    }

    // 全局 App 配置
    this.appConfig = appConfig
  }
}
