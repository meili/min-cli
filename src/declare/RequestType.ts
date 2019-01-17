/**
 * 请求类型
 * ① 匹配查找路径
 * ② 更新目标节点
 *
 * @export
 * @enum {number}
 */
export enum RequestType {
  // TEMPLATE
  TEMPLATE = 'TEMPLATE', // 匹配和更新 import or include

  // SCRIPT
  SCRIPT = 'SCRIPT', // 匹配和更新 import or request

  // STYLE
  STYLE = 'STYLE', // 匹配和更新 @import

  // STATIC
  JSON = 'JSON', // 匹配和更新 静态资源，比如 json 文件

  // ICONFONT
  ICONFONT = 'ICONFONT', // 匹配和更新 字体文件，比如 eot svg ttf woff 文件

  // IMAGE
  IMAGE = 'IMAGE', // 匹配和更新 图片资源，比如 png jpg jpeg gif bmp 文件

  // WXS
  WXS = 'WXS',

  // SFC
  WXA = 'WXA', // 匹配和更新 全局模板
  WXP = 'WXP', // 匹配和更新 using
  WXC = 'WXC' // 匹配和更新 using
}
