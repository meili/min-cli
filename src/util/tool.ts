import * as path from 'path'
import * as fs from 'fs-extra'
import * as _ from 'lodash'
import { XcxNode, XcxTraverse } from '../class'
import { config } from '../util'
import { ScaffoldType, RequestType } from '../declare'

export type MPath = string | path.ParsedPath

export function getModifiedTime (mpath: MPath): number {
  let spath = pathToString(mpath)
  return isFile(spath) ? +fs.statSync(spath).mtime : 0
}

export function pathToString (mpath: MPath): string {
  if (!_.isString(mpath)) {
    return path.join(mpath.dir, mpath.base)
  }
  return mpath
}

export function pathToParse (mpath: MPath): path.ParsedPath {
  if (_.isString(mpath)) {
    return path.parse(mpath)
  }
  return mpath
}

export function isFile (mpath: MPath): boolean {
  let spath = pathToString(mpath)

  if (!fs.existsSync(spath)) return false

  return fs.statSync(spath).isFile()
}

export function isDir (mpath: MPath): boolean {
  let spath = pathToString(mpath)

  if (!fs.existsSync(spath)) return false

  return fs.statSync(spath).isDirectory()
}

export function unlink (mpath: MPath) {
  let spath = pathToString(mpath)
  try {
    fs.unlinkSync(spath)
    return true
  } catch (e) {
    return e
  }
}

export function readFile (mpath: MPath): string {
  let spath = pathToString(mpath)
  let rst = ''
  try {
    rst = fs.readFileSync(spath, 'utf-8')
  } catch (e) {
    rst = ''
  }
  return rst
}

export function writeFile (mpath: MPath, data: string) {
  let ppath = pathToParse(mpath)
  let spath = pathToString(mpath)

  if (!this.isDir(ppath.dir)) {
    fs.ensureDirSync(ppath.dir)
  }
  fs.writeFileSync(spath, data)
}

export function copyFile (srcFilePath: string, destFilePath: string) {
  let destDirPath = path.dirname(destFilePath)
  if (!this.isDir(destDirPath)) {
    fs.ensureDirSync(destDirPath)
  }
  fs.copySync(srcFilePath, destFilePath)
}

export function overrideNpmLog () {
  let log = require('npmlog');

  ['info'].forEach((name: string) => {
    let _log = log[name]
    log[name] = function (...args: String[]) {
      this.heading = ''
      if (args[0] === 'version' || args[0] === 'versioning') {
        return
      }
      _log.apply(this, args)
    }
  })
}

export function setLernaConfig (version = 'independent') {
  let Repository = require('lerna/lib/Repository')
  if (_.isFunction(Repository)) {
    Repository.prototype._lernaJson = {
      lerna: '2.4.0',
      packages: getLernaPackageConfigs(),
      version
    }
  } else {
    // TODO
  }
}

export function getLernaPackageConfigs () {
  return [
    `${config.packages}/*`
  ]
}

export function getRealPkgName (name: string) {
  if (name && !new RegExp(`^${config.prefixStr}`).test(name)) {
    name = `${config.prefixStr}${name}`
  }
  return name
}

export function getRealPkgNameWithScope (name: string) {
  if (name) {
    // loading => wxc-loading
    name = getRealPkgName(name)

    // wxc-loading => @minui/wxc-loading
    if (config.npm.scope && !new RegExp(`^${config.npm.scope}`).test(name)) {
      name = `${config.npm.scope}/${name}`
    }
  }
  return name
}

export function getRealPageName (name: string) {
  return name.replace(new RegExp(`^${config.prefixStr}`), '')
}

/**
 * 获取脚手架模板的路径
 *
 * @param {ScaffoldType} scaffoldType Scaffold类型
 * @param {string} [filePath=''] 文件地址
 * @returns
 */
export function getScaffoldPath (scaffoldType: ScaffoldType, filePath: string = '') {
  return path.join(__dirname, `../../scaffold/${scaffoldType}`, filePath)
}

/**
 * 获取package目标路径
 *
 * @param {string} pkgName 包名称
 * @param {string} [filePath=''] 文件地址
 * @returns
 */
export function getDestPackagePath (pkgName: string, filePath: string = '') {
  return config.getPath('packages', pkgName, filePath)
}

/**
 * 获取page目标路径
 *
 * @param {ExampleType} exampleType Example类型
 * @param {string} pkgNameSuffix 包名后缀，不包含wxc-
 * @param {string} [filePath=''] 文件路径
 * @returns
 */
export function getDestPagePath (pkgNameSuffix: string, filePath: string = '') {
  return config.getPath('pages', pkgNameSuffix, filePath)
}

/**
 * 获取project项目路径
 *
 * @export
 * @param {string} projectName
 * @param {string} [filePath='']
 * @returns
 */
export function getDestProjectPath (projectName: string, filePath: string = '') {
  return path.join(config.cwd, projectName, filePath)
}

/**
 * 编译WXC组件，从node_modules
 *
 * @export
 * @param {string[]} pkgNames
 */
export function buildNpmWXCs (pkgNames: string[]) {
  let entries: string[] = []
  let requests = pkgNames.filter(pkgName => {
    let pkgPath = config.getPath('npm.src', pkgName, 'package.json')

    if (!fs.existsSync(pkgPath)) {
      return false
    }

    let pkgData = fs.readJsonSync(pkgPath)

    // 验证 min-cli 开发的 小程序组件
    if (!_.get(pkgData, 'minConfig.component') && !_.get(pkgData, 'config.min.component')) {
      return false
    }

    let entryConfig: string[] = _.get(pkgData, 'minConfig.entry')
    if (_.isArray(entryConfig) && entryConfig.length) {
      entryConfig.forEach(entry => {
        entries.push(pkgName + '/' + entry)
      })
      return false
    }
    return true
  })

  requests = _.uniq(requests.concat(entries))
  let xcxNodes: XcxNode[] = []

  requests.forEach(request => {
    let xcxNode = XcxNode.create({
      request,
      requestType: RequestType.WXC,
      isMain: true,
      parent: config.cwd
    })
    if (xcxNode !== null) {
      xcxNodes.push(xcxNode)
    }
  })

  // 转换
  XcxTraverse.traverse(xcxNodes, {
    enter (xcxNode: XcxNode) {
      // 编译
      xcxNode.compile()
    }
  })
}

/**
 * 页面名称转成文件路径
 *
 * @private
 * @param {(string | string[])} name
 */
export function pageName2Pages (name: string | string[] = []) {
  let names: string[] = []
  if (_.isArray(name)) {
    names = name
  } else if (name && name.trim()) {
    names = name.trim().split(',').map(value => value.trim())
  }
  let pages: string[] = names.map(name => {
    return `pages/${name}/index`
  })
  return pages
}

export function checkLocalFile (url: string) {
  if (url.indexOf(';base64,') !== -1) {
    return false
  }

  if (/^(https?\:|\:\/\/)/.test(url)) {
    return false
  }

  return true
}

// export function getAppConfig (): any {
//   const jsonPath = config.getPath('src', 'app.json')
//   let jsonData = {}
//   if (!fs.existsSync(jsonPath)) {
//     log.fatal('找不到应用程序配置文件：app.json')
//     return jsonData
//   }

//   try {
//     jsonData = fs.readJsonSync(jsonPath)
//   } catch (err) {
//     log.fatal(err)
//   }
//   return jsonData
// }

// export function getAppConfigTabbarList (jsonData: any): any[] {
//   let { tabBar = { list: [] } } = jsonData
//   let { list = [] } = tabBar
//   return list
// }

// export function genAppConfig (pages: string[], isDev = false) {
//   if (pages.length === 0) {
//     log.fatal('app.json 的 pages 字段长度为0')
//     return
//   }
//   const jsonData = getAppConfig()
//   const tabBarList = getAppConfigTabbarList(jsonData)
//   let homePage = tabBarList.length > 0 ? tabBarList[0].pagePath : ''

//   if (isDev && pages[0] !== homePage) {
//     let devPath = pages[0]
//     let devSeps = devPath.split('/')
//     let devName = devSeps[devSeps.length - 1]
//     let iconPath = 'assets/tab/dev.png'
//     let selectedIconPath = 'assets/tab/dev_hl.png'
//     tabBarList.unshift({
//       pagePath: devPath,
//       iconPath,
//       selectedIconPath,
//       text: `dev-${devName}`
//     })
//     fs.copySync(path.join(__dirname, '../../scaffold', iconPath), config.getPath('dest', iconPath))
//     fs.copySync(path.join(__dirname, '../../scaffold', selectedIconPath), config.getPath('dest', selectedIconPath))

//     homePage = devPath
//   }

//   if (homePage) {
//     pages = pages.filter((page) => page !== homePage)
//     pages.unshift(homePage)
//   }

//   jsonData.pages = pages
//   if (tabBarList) {
//     jsonData.tabBar.list = tabBarList
//   }

//   let appConfigCont = JSON.stringify(jsonData, null, 2)
//   let appConfigPath = config.getPath('dest', 'app.json')

//   // 日志
//   log.msg(LogType.GENERATE, path.relative(config.cwd, appConfigPath))

//   // 写入
//   fs.writeFileSync(appConfigPath, appConfigCont, 'utf8');
// }
