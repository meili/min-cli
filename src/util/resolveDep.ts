import * as url from 'url'
import * as path from 'path'
import * as fs from 'fs-extra'
import * as _ from 'lodash'
import { Request } from '../class'
import { RequestType, LangTypes } from '../declare'
import util, { config } from '../util'

// check if the directory is a package.json dir
const packageMainCache = Object.create(null)

const requestPathCache = Object.create(null)

function getStat (requestPath: string) {
  let isFile = util.isFile(requestPath)
  let isDir = isFile ? false : util.isDir(requestPath)
  return {
    isFile,
    isDir
  }
}

function readPackageMain (requestPath: string) {
  let pkgMain = ''
  let entry = packageMainCache[requestPath]
  if (entry) {
    return entry
  }

  let jsonPath = path.resolve(requestPath, 'package.json')

  if (!fs.existsSync(jsonPath)) {
    return false
  }

  try {
    let json = fs.readJsonSync(jsonPath)
    pkgMain = packageMainCache[requestPath] = json.main
  } catch (err) {
    err.path = jsonPath
    err.message = 'Error parsing ' + jsonPath + ': ' + err.message
    throw err
  }
  return pkgMain
}

function tryPackage (requestPath: string, exts: string[]) {
  let pkgMain = readPackageMain(requestPath)

  if (!pkgMain) {
    return false
  }

  let filename = path.resolve(requestPath, pkgMain)
  return tryFile(filename) ||
         tryExtensions(filename, exts) ||
         tryExtensions(path.resolve(filename, 'index'), exts)
}

function tryFile (requestPath: string) {
  return getStat(requestPath).isFile && requestPath
}

// given a path check a the file exists with any of the set extensions
function tryExtensions (requestPath: string, exts: string[]) {
  for (let i = 0; i < exts.length; i++) {
    let filename = tryFile(requestPath + exts[i])

    if (filename) {
      return filename
    }
  }
  return false
}

/**
 * 检测请求类型是否包含 config.alias 比如
 * ① request = @scope/wxc-loading => true
 * ② request = components/example => true
 * ③ request = ./hello/index => false
 *
 * @param {string} request
 * @returns
 */
function inAlias (request: string): boolean {
  return getAlias(request) !== null
}

function getAlias (request: string): {name: string, value: string} | null {
  let spes = request.split('/')

  for (let i = spes.length; i > 0; i--) {
    let name = spes.slice(0, i).join('/')
    if (config.alias[name]) {
      return {
        name,
        value: config.alias[name]
      }
    }
  }

  // for (let key in config.alias) {
  //   if (spes[0] === key) {
  //     return {
  //       name: key,
  //       value: config.alias[key]
  //     }
  //   }
  // }
  return null
}

/**
 * 检测请求类型是否包含 config.scope 比如
 * ① request = @scope/wxc-loading => true
 * ② request = components/example => false
 * ③ request = ./hello/index => false
 *
 * @param {string} request
 * @returns
 */
function inScope (request: string): boolean {
  let spes = request.split('/')
  return spes[0] === config.npm.scope
}

/**
 * 判断是否为wxc组件
 *
 * @param {string} request
 * @returns {boolean}
 */
function isWxcPackage (request: string, requestType: RequestType): boolean {
  // isWXC && @scope/wxc- => true
  // isWXC && wxc-loading => true
  // isWXC && ./index.wxc => false
  // isWXC && alias/wxc-toast => false
  // isWXC && src/... => false
  // isWXC && packages/... => false

  if (requestType !== RequestType.WXC) {
    return false
  }
  if (request.charAt(0) === '.') {
    return false
  }
  if (request.split('/')[0] === config.src) {
    return false
  }
  if (request.split('/')[0] === config.packages) {
    return false
  }
  if (!inScope(request) && inAlias(request)) {
    return false
  }
  return true
}

function getRequestType (ext: string): RequestType | undefined {
  let { requestType = undefined } = LangTypes[ext] || {}
  return requestType
}

function getRequestLookupExts (requestType: RequestType): string[] {
  let exts: string[] = []

  _.forIn(LangTypes, (value, key) => {
    if (requestType === value.requestType) {
      exts.push(key)
    }
  })

  return exts
}

/**
 * 返回匹配的请求后缀和请求类型
 * ① 通过扩展名匹配，优先返回与扩展名匹配的`后缀`和`请求类型`
 * ② 未匹配到，默认是`.js 后缀` 和`REQUEST_JS 请求类型`
 *
 * @param {string} request
 * @param {RequestType} [requestType]
 * @returns {{exts: string[], requestType: RequestType}}
 */
function getMatchRequest (request: string, requestType?: RequestType): {lookupExts: string[], requestType: RequestType} {
  let ext = path.extname(request)
  let exts: string[] = []

  // 非白名单内的扩展名，默认通过 requestType 来获取 ext 扩展名
  if (ext) {
    ext = _.findKey(config.ext, value => value === ext) ? ext : ''
  }

  if (!ext && !requestType) {
    throw new Error(`Ext 和 RequestType 不能同时为空`)
  }

  if (ext && requestType) {
    if (getRequestType(ext) !== requestType) {
      throw new Error(`Ext 和 RequestType 同时存在，但通过 Ext 找到的 RequestType 与实际的不符合`)
    }
  } else if (!ext && requestType) {
    exts = [
      ...exts,
      ...getRequestLookupExts(requestType)
    ]
  } else if (ext && !requestType) {
    requestType = getRequestType(ext)
  }

  if (!requestType) {
    throw new Error('没有找到匹配的 RequestType，请确认是否将 Ext 与 RequestType 进行关联')
  }

  return {
    lookupExts: exts,
    requestType
  }
}

// 补充扩展名
function supExtName (filePath: string, defExtName = config.ext.js) {
  if (path.extname(filePath) === '') {
    return `${filePath}${defExtName}`
  }
  return filePath
}

function findPath (request: string, requestType: RequestType, paths: string[], exts: string[]): any {
  if (!paths || paths.length === 0) {
    return false
  }

  let cacheKey = request + '\x00' + (paths.length === 1 ? paths[0] : paths.join('\x00'))
  let entry = requestPathCache[cacheKey]
  if (entry) {
    if (util.isFile(entry)) {
      return entry
    } else {
      delete requestPathCache[cacheKey]
    }
  }

  let trailingSlash = request.length > 0 &&
                      request.charCodeAt(request.length - 1) === 47 /* / */

  // For each path
  for (let i = 0; i < paths.length; i++) {
    let curPath = paths[i]
    let curRequest = request

    if (!curPath || !getStat(curPath).isDir) {
      continue
    }

    if (isWxcPackage(curRequest, requestType)) {
      // @scope/wxc-hello => ['@scope', 'wxc-hello']
      // @scope/wxc-hello/index => ['@scope', 'wxc-hello', 'index']
      // wxc-hello => ['wxc-hello']
      // wxc-hello/index => ['wxc-hello', 'index']
      let seps = curRequest.split('/')
      let scope = ''
      if (seps.length > 0 && seps[0].startsWith('@')) { // ['@scope', 'wxc-hello', ...]
        if (seps.length === 1) {  // ['@scope']
          throw new Error(`引用路径错误${curRequest}`)
        }
        // ['@scope', 'wxc-hello', ...] => @scope
        scope = seps[0]
        // ['@scope', 'wxc-loading', ...] => ['wxc-loading', ...]
        seps.shift()
      }

      // ['wxc-hello', ...]
      if (seps.length === 1) {
        // ['wxc-hello'] => ['wxc-hello', 'src', 'index']
        seps = seps.concat([config.package.src, config.package.default])
      } else if (seps.length > 1 && seps[1] !== 'src') {
        // ['wxc-hello', 'index'] => ['wxc-hello', 'src', 'index']
        seps.splice(1, 0, config.package.src)
      }

      if (scope) {
        seps.unshift(scope)
      }
      curRequest = seps.join('/')
    }

    // 当巡回的路径与 cwd 相同时，开始匹配 alias 别名路径
    if (curPath === config.cwd) {
      let alias = getAlias(curRequest)
      if (alias) {
        curRequest = curRequest.replace(alias.name, alias.value)
        // let spes = curRequest.split('/')
        // spes.shift()
        // spes.unshift(alias.value)

        // request = 'components/example' => 'source/components/example'
        // request = '@scope/wxc-hello/src/index' => 'source/packages/wxc-hello/src/index'
        // curRequest = spes.join('/')
      }
    }

    // TODO 简陋版
    // 支持 package.json 的 browser
    let curPathPkgPath = path.join(curPath, 'package.json')
    if (/node_modules\//.test(curPath) && fs.existsSync(curPathPkgPath)) {
      let { browser = {} } = fs.readJSONSync(curPathPkgPath)

      for (const key in browser) {
        let aPath = supExtName(path.join(curPath, key))
        let bPath = supExtName(path.join(curPath, curRequest))
        if (aPath === bPath) {
          curRequest = browser[key]
        }
      }
    }

    let basePath = path.resolve(curPath, curRequest)

    // Resolve ID
    if (config.resolveId) {
      // node_modules/@minui/wxc-loading/config.js
      let relativePath = path.relative(config.cwd, basePath)
      // dist/config.js
      let resolvePath = config.resolveId[relativePath]
      if (resolvePath) {
        // ~/cwd/dist/config.js
        basePath = path.join(config.cwd, resolvePath)
      }
    }

    let filename
    let stat = getStat(basePath)

    // index or index.js
    if (!trailingSlash) {
      if (stat.isFile) { // File.
        filename = basePath
      } else if (stat.isDir) { // Directory.
        filename = tryPackage(basePath, exts)
      }

      if (!filename) {
        // try it with each of the extensions
        filename = tryExtensions(basePath, exts)
      }
    }

    if (!filename && stat.isDir) {  // Directory.
      filename = tryPackage(basePath, exts)
    }

    if (!filename && stat.isDir) {  // Directory.
      // try it with each of the extensions at "index"
      filename = tryExtensions(path.resolve(basePath, 'index'), exts)
    }

    if (filename) {
      requestPathCache[cacheKey] = filename
      return filename
    }
  }
  return false
}

/**
 * 从 node_modules 和 source/packages 目录下，就近原则返回匹配的 node_modules 目录
 *
 * @param {string} parent
 * @returns
 */
function resolveLookupNpmPaths (parent: string) {
  let paths = [path.join(config.cwd, 'node_modules')]

  // 'node_modules/@scope/wxc-hello'
  // 'source/packages/wxc-hello'
  // 'source/pages/hello'
  let relPath = path.relative(config.cwd, parent)

  // 相对路径起始不包含 node_modules 或 source/packages，返回默认
  if (!new RegExp(`^(node_modules|${config.packages})\\${path.sep}`).test(relPath)) {
    return paths
  }

  // ['node_modules', '@scope', 'wxc-hello']
  // ['source', 'packages', 'wxc-hello']
  let spes = relPath.split(path.sep)

  for (let i = 0; i < spes.length; i++) {
    let name = spes[i]
    // node_modules
    // @scope
    if (name === 'node_modules' || name === config.npm.scope) {
      continue
    }

    let lookup = spes.slice(0, i + 1).join(path.sep)

    // 'source'
    // 'source/packages'
    if (lookup === config.src || lookup === config.packages) {
      continue
    }

    // 'node_modules/@scope/wxc-hello/node_modules'
    // 'source/packages/wxc-hello/node_modules'
    paths.unshift(
      path.join(config.cwd, lookup, 'node_modules')
    )
  }

  return paths
}

function resolveLookupPaths (request: string, parent?: string): string[] {
  // 父路径转换
  if (parent) {
    // 绝对路径
    parent = path.isAbsolute(parent) ? parent : path.join(config.cwd, parent)
    // 目录地址
    parent = util.isFile(parent) ? path.dirname(parent) : parent
  }

  // 在 Alias 内
  if (inAlias(request)) { // alias => {'components': 'source/components', '@scope': 'source/packages'}
    let paths = [
      config.cwd // 任何的别名默认从 cwd 里开始查找
    ]

    // 在 Scope 内
    if (inScope(request)) { // scope => '@scope'
      paths = [
        ...paths,
        ...resolveLookupNpmPaths(parent || config.cwd) // 再从 node_modules 里查找
      ]
    }
    return paths
  }

  let defRelPath = parent || config.getPath('src')

  // 相对路径，优先从 parent，再默认从 src 路径
  if (request.charAt(0) === '.') { // ./index
    return [defRelPath]
  }

  // 非点开始的相对路径，返回结果同上，只不过会判断在 parent 或 src 下当前文件是否存在
  if (request.charAt(0) !== '@' && path.extname(request).length > 1) { // index.js
    if (fs.existsSync(path.join(defRelPath, request))) {
      return [defRelPath]
    }
  }

  // 最后再从 packages 和 node_modules 里查找
  return [
    config.getPath('packages'),
    ...resolveLookupNpmPaths(parent || config.cwd)
  ]
}

export function src2destRelative (srcRelative: string, isPublish?: boolean) {
  // let ext = path.extname(srcRelative)
  let destRelative = srcRelative

  if (!isPublish) {
    // source => dist
    destRelative = destRelative.replace(new RegExp(`^${config.src}`), config.dest)
  }

  // packages => dist/packages
  destRelative = destRelative.replace(new RegExp(`^${config.packages}`), (match) => {
    return config.npm.dest
  })

  // node_modules => dist/npm/wxcs
  // path/node_modules => path/npm/wxcs
  destRelative = destRelative.replace(new RegExp(`(^|\\${path.sep})${config.npm.src}`, 'ig'), (match, $1) => {
    // let npm = ext === config.ext.wxc ? config.npm.dest.wxcs : config.npm.dest.modules
    let npmDest = config.npm.dest

    if ($1 === '') {
      // node_modules => dist/npm/wxcs
      // node_modules => dist/npm/modules
      return npmDest
    } else if ($1 === path.sep) {
      // path/node_modules => path/npm/wxcs
      // path/node_modules => path/npm/modules
      return path.join(path.sep, npmDest.split(path.sep).slice(1).join(path.sep))
    } else {
      return match
    }
  })

  // /wxc-hello/src/ => /wxc-hello/dist/
  destRelative = destRelative.replace(new RegExp(`(\\${path.sep}${config.prefixStr}[a-z-]+\\${path.sep})([a-z]+)`), (match, $1, $2) => {
    if ($2 === config.package.src) {
      return `${$1}${config.package.dest}`
    }
    return match
  })
  return destRelative
}

export function resolveDep (requestOptions: Request.Options): Request.Core {
  let {
    request,
    requestType: type,
    parent,
    isMain,
    isPublish,
    isThreeNpm = false
  } = requestOptions

  if (!request && !parent) {
    throw new Error('依赖分析错误，request 和 parent 不能同时为空')
  }

  if (request && path.isAbsolute(request)) {
    if (isMain) {
      parent = path.dirname(request)
      request = `./${path.basename(request)}`
    } else {
      throw new Error(`依赖分析错误，非入口文件 request 不能为绝对路径`)
    }
  }

  if (!request && parent) {
    if (isMain) {
      parent = path.dirname(parent)
      request = `./${path.basename(parent)}`
    } else {
      throw new Error(`依赖分析错误，非入口文件 request 不能为空`)
    }
  }

  let rawRequest = url.parse(request).pathname || ''

  let {
    requestType,
    lookupExts
  } = getMatchRequest(rawRequest, type)

  let lookupPaths = resolveLookupPaths(rawRequest, parent)

  let srcRelative = ''
  let ext = ''
  let dest = ''
  let destRelative = ''
  let $isThreeNpm = false

  let src = findPath(rawRequest, requestType, lookupPaths, lookupExts) || ''
  if (src) {
    srcRelative = path.relative(config.cwd, src)
    ext = path.extname(src)
    destRelative = src2destRelative(srcRelative, isPublish)
    dest = path.join(config.cwd, destRelative)

    // 判定是否来自第三方NPM（NPM包中非WXC的都定位为第三方NPM包，主要是不走编译）
    if (srcRelative.split(path.sep)[0] === 'node_modules') {
      if (rawRequest.charAt(0) === '.') { // 引用相对路径，继承父级
        $isThreeNpm = isThreeNpm
      } else if (ext !== config.ext.wxc) { // 所有的NPM包中，引用路径扩展非.wxc，都定位第三方NPM包
        $isThreeNpm = true
      }
    }
  }

  return {
    // for Request.Default
    request,
    requestType,

    // for Request.Path
    src,
    srcRelative,
    ext,
    dest,
    destRelative,

    isThreeNpm: $isThreeNpm
  }
}
