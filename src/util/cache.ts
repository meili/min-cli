import * as path from 'path'
import * as fs from 'fs-extra'
import * as _ from 'lodash'
import { XcxNode } from '../class'
import { config } from '../util'

/**
 * 转换相对地址
 *
 * @param {string} src
 * @returns
 */
function src2relative (src: string) {
  if (!path.isAbsolute(src)) {
    return src
  }
  return path.relative(config.cwd, src)
}

/**
 * 转换请求地址
 *
 * @param {string} src
 * @returns
 */
function path2request (src: string) {
  return src.split(path.sep).join('/')
}

/**
 * 绑定路径转换器
 *
 * @param {Object} target
 * @param {string[]} methods
 */
function bindChnageRequestPath (target: Object, methods: string[]) {
  methods.forEach(method => {
    let fn = target[method]
    if (!_.isFunction(fn)) return
    target[method] = (src: string, ...args: any[]) => {
      src = src2relative(src)
      src = path2request(src)
      args.unshift(src)
      return fn.apply(target, args)
    }
  })
}

/**
 * 找到 MD 文件父级的 wxp 页面路径
 *
 * @param {string} file
 * @returns
 */
function getMdRootWxpRequestPath (request: string) {
  let srcRelative = path.normalize(request)
  let extName = path.extname(srcRelative)
  let baseName = path.basename(srcRelative)
  let dirName = path.dirname(srcRelative)
  let packageRegExp = new RegExp(`^${config.packages}\\${path.sep}${config.prefixStr}([a-z-]+)$`)

  let mdRootWxpPath = ''
  if (
    // demos/*.wxc
    (extName === config.ext.wxc && new RegExp(`\\${path.sep}demos$`).test(dirName)) ||
    // docs/*.md
    (extName === '.md' && new RegExp(`\\${path.sep}docs$`).test(dirName))) {
    // ~/you_project/src/pages/name/index.wxp
    mdRootWxpPath = path.join(config.cwd, dirName, '..', `index${config.ext.wxp}`)
    // console.log('demos/docs下的文件更改后，父级路径：', mdRootWxpPath)
  } else if (
    // packages/wxc-name/README.md
    (baseName.toLowerCase() === 'readme.md' && packageRegExp.test(dirName))) {
    let matchs = dirName.match(packageRegExp)
    let pageName = matchs && matchs.length > 1 ? matchs[1] : ''
    // ~/you_project/src/pages/name/index.wxp
    mdRootWxpPath = config.getPath('pages', pageName, `index${config.ext.wxp}`)
    // console.log('readme更改后，父级路径：', mdRootWxpPath)
  }

  if (mdRootWxpPath && fs.existsSync(mdRootWxpPath)) {
    mdRootWxpPath = src2relative(mdRootWxpPath)
    mdRootWxpPath = path2request(mdRootWxpPath)
    // console.log(mdRootWxpPath)
    return mdRootWxpPath
  }
  return ''
}

export const xcxNodeCache = {
  cached: {},
  set (request: string, xcxNode: XcxNode): void {
    this.cached[request] = xcxNode
  },
  get (request: string): XcxNode | null {
    return this.cached[request] || null
  },
  getBeDepends (request: string): string[] {
    let beDepends: string[] = []
    // 将 请求路径转 换成 系统规范格式的相对路径
    let srcRelative = path.normalize(request)
    _.forIn(this.cached, (xcxNode: XcxNode, cacheKey: string) => {
      let isExsit = xcxNode.useRequests.some(useRequest => useRequest.srcRelative === srcRelative)
      if (isExsit) {
        beDepends.push(cacheKey)
      }
    })
    return beDepends
  },
  remove (request: string): void {
    if (this.check(request)) {
      delete this.cached[request]
    }
  },
  check (request: string): boolean {
    return this.get(request) !== null
  },
  clear () {
    this.cached = {}
  }
}

bindChnageRequestPath(xcxNodeCache, ['set', 'get', 'getBeDepends', 'remove', 'check'])

export const xcxNext = {
  /**
   * 缺少依赖的文件列表，在编译过程中发现有依赖缺失的，都会记录到这里
   */
  lack: {},
  /**
   * 缓冲区，临时放新增、修改、删除的文件，用完后要清空
   */
  buffer: {},
  addLack (request: string) {
    this.lack[request] = true
  },
  removeLack (request: string) {
    if (!this.checkLack(request)) {
      return
    }
    delete this.lack[request]
  },
  checkLack (request: string) {
    return !!this.lack[request]
  },
  watchNewFile (request: string) {
    if (path.extname(request) === config.ext.wxp) {
      this.buffer[request] = true
    }
  },
  watchChangeFile (request: string) {
    if (xcxNodeCache.check(request)) {
      this.buffer[request] = true
    }

    let mdRootWxpPath = getMdRootWxpRequestPath(request)
    if (mdRootWxpPath) {
      this.buffer[mdRootWxpPath] = true
    }
  },
  watchDeleteFile (request: string) {
    if (xcxNodeCache.check(request)) {
      xcxNodeCache.remove(request)

      // 上层依赖
      let beDepends = xcxNodeCache.getBeDepends(request)
      beDepends.forEach(request => this.buffer[request] = true)
    }

    let mdRootWxpPath = getMdRootWxpRequestPath(request)
    if (mdRootWxpPath) {
      this.buffer[mdRootWxpPath] = true
    }
  },
  reset () {
    this.buffer = {}
  },
  clear () {
    this.lack = {}
    this.buffer = {}
  },
  get (): string[] {
    let next = {
      ...this.lack,
      ...this.buffer
    }

    return _.keys(next)
  }
}

bindChnageRequestPath(xcxNext, ['addLack', 'removeLack', 'checkLack', 'watchNewFile', 'watchChangeFile', 'watchDeleteFile'])

// let xcxAstCachePath = config.getPath('cache.xcxast')
// fs.ensureDirSync(xcxAstCachePath)
// // function getFiles () {
// //   let files = fs.readdirSync(xcxAstCachePath)
// //   let result = {}
// //   files.forEach(file => result[`${file}`] = true)
// //   return result
// // }
// export const xcxAst = {
//   cached: {},
//   files: {},
//   transform (source: string) {
//     // console.time('sum')
//     let hash = sum(source)
//     // console.timeEnd('sum')
//     let ast = this.cached[hash]

//     if (ast) {
//       return ast
//     }

//     let fileName = `${hash}.json`
//     let filePath = path.join(xcxAstCachePath, fileName)

//     if (this.files[fileName]) {
//       // console.time('read')
//       ast = fs.readJsonSync(filePath)
//       // console.timeEnd('read')
//     } else {
//       let result = babel.transform(source, {
//         ast: true,
//         babelrc: false
//       })
//       ast = result.ast || t.emptyStatement()
//       // delete ast['tokens']
//       // fs.writeJsonSync(filePath, ast)
//     }

//     this.cached[hash] = ast

//     return ast
//   }
// }

// function getCacheKey (request: string, lookUpPaths: string[]) {
//   let cacheKey = request + '\x00' + (lookUpPaths.length === 1 ? lookUpPaths[0] : lookUpPaths.join('\x00'))
//   return cacheKey
// }

// export const requestPathCache = {
//   cached: {},
//   add (request: string, lookUpPaths: string[], filename: string) {
//     let cacheKey = getCacheKey(request, lookUpPaths)
//     this.cached[cacheKey] = filename
//   },
//   remove (request: string) {

//   },
//   get (request: string, lookUpPaths: string[]) {
//     let cacheKey = getCacheKey(request, lookUpPaths)
//     return this.cached[cacheKey]
//   },
//   check (request: string, lookUpPaths: string[]) {
//     return !!this.get(request, lookUpPaths)
//   }
// }

// export const xcxCache = {
//   cache: {},
//   changed: false,
//   cachePath: config.getPath('cache.file'),

//   get () {
//     if (this.cache) {
//       return this.cache
//     }

//     if (util.isFile(this.cachePath)) {
//       this.cache = util.readFile(this.cachePath)
//       try {
//         this.cache = JSON.parse(this.cache)
//       } catch (e) {
//         this.cache = null
//       }
//     }

//     return this.cache || {}
//   },

//   set (mpath: util.MPath) {
//     let cache = this.get()
//     let spath = util.pathToString(mpath)
//     cache[spath] = util.getModifiedTime(mpath)
//     this.cache = cache
//     this.changed = true
//   },

//   remove (mpath: util.MPath) {
//     let cache = this.get()
//     let spath = util.pathToString(mpath)
//     delete cache[spath]
//     this.cache = cache
//     this.changed = true
//   },

//   clear () {
//     util.unlink(this.cachePath)
//   },

//   save () {
//     if (this.changed) {
//       util.writeFile(this.cachePath, JSON.stringify(this.cache))
//       this.changed = false
//     }
//   },

//   check (mpath: util.MPath) {
//     let spath = util.pathToString(mpath)
//     let cache = this.get()
//     return cache[spath] && cache[spath] === util.getModifiedTime(spath)
//   }
// }
