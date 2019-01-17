export {
  beautifyHtml,
  beautifyCss,
  beautifyJs
} from './beautify'

export { filterPrefix, filterNpmScope } from './filter'

export { config, customConfig, defaultConfig } from './config'

export { xcxNodeCache, xcxNext } from './cache'

export { getText, getInnerHTML, getOuterHTML} from './dom-serializer'
export { dom } from './dom'

export { exec } from './exec'

export { Global } from './global'

export { log, LogType, LogLevel } from './log'

export { md } from './md'

export { resolveDep, src2destRelative } from './resolveDep'

export const ICONFONT_PATTERN = /url\([\'\"]{0,}?([^\'\"]*)[\'\"]{0,}\)/

import * as tool from './tool'
export default tool
