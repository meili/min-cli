import { RequestType, CompileType } from '../declare'
import { config } from '../util'

const { ext } = config

/**
 * 请求类型与扩展名的匹配
 */
export const LangTypes: {
  [name: string]: {
    requestType: RequestType,
    compileType?: CompileType
  }
} = {
  // SCRIPT
  [ext.js]: {
    requestType: RequestType.SCRIPT,
    compileType: undefined
  },

  // JSON
  [ext.json]: {
    requestType: RequestType.JSON,
    compileType: undefined
  },

  // IMAGE
  [ext.png]: {
    requestType: RequestType.IMAGE,
    compileType: undefined
  },
  [ext.jpg]: {
    requestType: RequestType.IMAGE,
    compileType: undefined
  },
  [ext.jpeg]: {
    requestType: RequestType.IMAGE,
    compileType: undefined
  },
  [ext.gif]: {
    requestType: RequestType.IMAGE,
    compileType: undefined
  },
  [ext.webp]: {
    requestType: RequestType.IMAGE,
    compileType: undefined
  },

  // ICON
  [ext.eot]: {
    requestType: RequestType.ICONFONT,
    compileType: undefined
  },
  [ext.svg]: {
    requestType: RequestType.ICONFONT,
    compileType: undefined
  },
  [ext.ttf]: {
    requestType: RequestType.ICONFONT,
    compileType: undefined
  },
  [ext.woff]: {
    requestType: RequestType.ICONFONT,
    compileType: undefined
  },

  // WXS
  [ext.wxs]: {
    requestType: RequestType.WXS,
    compileType: undefined
  },

  // TEMPLATE
  [ext.wxml]: {
    requestType: RequestType.TEMPLATE,
    compileType: undefined
  },

  // STYLE
  [ext.wxss]: {
    requestType: RequestType.STYLE,
    compileType: undefined
  },
  [ext.less]: {
    requestType: RequestType.STYLE,
    compileType: CompileType.LESS
  },
  [ext.pcss]: {
    requestType: RequestType.STYLE,
    compileType: CompileType.PCSS
  },

  // SFC
  [ext.wxa]: {
    requestType: RequestType.WXA,
    compileType: undefined
  },
  [ext.wxp]: {
    requestType: RequestType.WXP,
    compileType: undefined
  },
  [ext.wxc]: {
    requestType: RequestType.WXC,
    compileType: undefined
  }
}
