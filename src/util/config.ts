import * as fs from 'fs-extra'
import * as path from 'path'
import * as _ from 'lodash'
import { Config, CustomConfig } from '../declare'
import systemConfig from '../config'
import { filterPrefix } from '../util'

/**
 * 可访问路径类型
 */
type GetPathType = 'file' | 'src' | 'dest' | 'pages' | 'packages' | 'cache.file' | 'cache.xcxast' | 'npm.src' | 'npm.dest'

/**
 * 自定义配置白名单成员
 */
const CUSTOM_CONFIG_MEMBER: string[] = [
  'style',
  'compilers', // 编译器
  'src', // 源代码的路径
  'packages', // 组件库的路径
  'dest',// 编译后的路径
  'alias', // 别名，如components => src/components
  'resolveId', // 路径解析配置
  'resolveVirtual', // 虚拟路径
  'prefix',// 前缀，如wxc-
  'npm.scope',// 作用域名，如@minui
  'npm.dest',// npm编译后的路径，如dist/packages
  'projectType'// 项目类型，如component 和 application
]

/**
 * 自定义配置文件路径
 */
function getCustomConfigFilePath (cwd: string = systemConfig.cwd): string {
  return path.join(cwd, systemConfig.filename)
}

/**
 * 项目 package.json 路径
 */
function getProjectPackagePath (cwd: string = systemConfig.cwd): string {
  return path.join(cwd, 'package.json')
}

/**
 * 获取自定义配置
 */
function getCustomConfig (cwd: string = systemConfig.cwd): { [key: string]: CustomConfig } {
  const pkgPath = getProjectPackagePath(cwd)
  const filePath = getCustomConfigFilePath(cwd)

  let customConfigFromPkg: CustomConfig = {} // for package.json
  let customConfigFromFile: CustomConfig = {} // for min.config.json

  // in package.json
  if (fs.existsSync(pkgPath)) {
    customConfigFromPkg = _.pick(fs.readJsonSync(pkgPath)['minConfig'] || {}, CUSTOM_CONFIG_MEMBER) as CustomConfig
  }

  // in min.config.json
  if (fs.existsSync(filePath)) {
    customConfigFromFile = _.pick(fs.readJsonSync(filePath), CUSTOM_CONFIG_MEMBER) as CustomConfig
  } else { // min.config.js
    let jsConfigFilePath = path.join(path.dirname(filePath), `${path.basename(filePath, '.json')}.js`)
    let jsConfig = null
    if (fs.existsSync(jsConfigFilePath)) {
      try {
        jsConfig = require(jsConfigFilePath)
        customConfigFromFile = _.pick(jsConfig, CUSTOM_CONFIG_MEMBER) as CustomConfig
      } catch (error) {
        console.error('fail: read config file from min.config.js', error);
      }
    }
  }

  // merge customConfigFromPkg and customConfigFromFile
  let customConfig = _.merge({}, customConfigFromPkg, customConfigFromFile)

  return {
    customConfig,
    customConfigFromPkg,
    customConfigFromFile
  }
}

let scopeAliasMap = {}

/**
 * 配置转换函数
 * @param defaultConfig 默认配置
 * @param customConfig 自定义配置
 */
function convertConfig (defaultConfig: Config, customConfig: CustomConfig = {}) {

  // merge defaultConfig and minConfig
  let config = _.merge({}, defaultConfig, customConfig)

  function engine (rootConfig: Config, childConfig = rootConfig) {
    _.forIn(childConfig, (value: any, key: string) => {
      if (_.isObject(value)) {
        engine(rootConfig, value)
      } else if (_.isArray(value)) {
        value.forEach((item) => {
          engine(rootConfig, item)
        })
      } else if (_.isString(value)) {
        childConfig[key] = value.replace(/\{\{([a-z0-9]+)\}\}/g, (match, $1) => {
          if (_.isUndefined(rootConfig[$1]) || !_.isString(rootConfig[$1])) {
            throw new Error(`找不到变量 ${$1}`)
          }
          return rootConfig[$1]
        })
      }
    })
  }

  engine(config)

  _.forIn(scopeAliasMap, (value, key) => {
    // 将 map 区已映射的 scope 从 alias 区删除
    delete config.alias[key]
  })

  // 默认将 config.npm.scope 放入到 alias 中，并将 config.packages 作为值
  if (config.npm.scope && !config.alias[config.npm.scope]) {
    // 将已映射的 scope 放入 map 区
    scopeAliasMap[config.npm.scope] = true

    // 将 { key: scope, value: packages } 配置映射到 alias 里
    config.alias[config.npm.scope] = config.packages
  }

  return config
}

let defaultConfig = convertConfig(systemConfig)
let {
  customConfig,
  customConfigFromPkg,
  customConfigFromFile
} = getCustomConfig()

/**
 * 全部配置，基于默认和自定义配置的集合
 */
export const config = {
  get prefixStr () {
    return filterPrefix(this.prefix)
  },
  ...convertConfig(defaultConfig, customConfig),
  getPath (name: GetPathType, ...paths: string[]) {
    let names = name.split('.')

    let value = names.reduce((previousValue: string, currentValue: string) => {
      return previousValue[currentValue]
    }, this)

    return path.join(this.cwd, value, ...paths)
  },

  /**
   * 重载配置
   *
   * @param {string} [cwd=systemConfig.cwd]
   */
  reload (cwd: string = systemConfig.cwd) {
    let {
      customConfig: $customConfig,
      customConfigFromPkg: $customConfigFromPkg,
      customConfigFromFile: $customConfigFromFile
    } = getCustomConfig(cwd)

    // 更新 exports
    exports.customConfig = $customConfig
    exports.customConfigFromPkg = $customConfigFromPkg
    exports.customConfigFromFile = $customConfigFromFile

    // 合并到配置中心
    _.assign(this, convertConfig(defaultConfig, $customConfig), {
      cwd
    })
  },

  /**
   * 更新配置
   *
   * @param {*} newConfig
   */
  update (newConfig: any) {
    _.merge(this, newConfig)
  },

  /**
   * 更新自定义配置文件
   *
   * @param {*} newConfig
   */
  updateCustomFile (newConfig: any) {
    // 将 新的配置 合并到 自定义文件配置里
    _.merge(customConfigFromFile, newConfig || {})

    // 将 package.json 和 min.config.json 配置更新到 customConfig
    _.merge(customConfig, customConfigFromPkg, customConfigFromFile)

    // 将 defaultConfig 和 customConfig 合并到 config
    _.merge(this, convertConfig(defaultConfig, customConfig))

    let filePath = getCustomConfigFilePath()
    fs.writeFileSync(filePath, JSON.stringify(customConfigFromFile, null, 2))
  }
}

export {
  /**
   * 默认配置
   */
  defaultConfig,

  /**
   * 自定义配置，基于自定义配置文件 和 项目 package.json 配置的集合
   */
  customConfig,

  /**
   * 来自自定义文件的配置
   */
  customConfigFromFile,

  /**
   * 来自 项目 package.json 的配置
   */
  customConfigFromPkg
}
