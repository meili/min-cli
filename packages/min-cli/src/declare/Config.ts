export interface CustomConfig {
  compilers?: any
  plugins?: any
  lint?: any
  style?: {
    [key: string]: string | { [key: string]: string | Function | boolean | number }
  }
  src?: string // 源代码的路径
  packages?: string // 组件库的路径
  dest?: string// 编译后的路径
  alias?: {
    [key: string]: string
  } // 别名，如components => src/components
  resolveId?: {
    [key: string]: string
  }
  resolveVirtual?: {
    [key: string]: string
  }
  prefix?: string// 前缀，如wxc-
  npm?: {
    scope: string // 作用域名，如@minui
    dest: string // npm编译后的路径，如dist/packages
  }
  projectType?: string

  originRoutes?: () => string[]
}

export interface Config extends CustomConfig {
  // TODO 此处待优化CONFIG - START
  clear: boolean
  app: boolean
  // TODO 此处待优化CONFIG - END
  title: string
  cli: string
  filename: string
  projectType: string // in customConfig. include min.config.json and minConfig of package.json
  cwd: string
  prefix: string
  src: string
  dest: string
  pages: string
  packages: string // wxc组件项目目录
  package: { // wxc组件
    src: string // 源路径
    dest: string // 编译路径
    default: 'index' // 默认文件
  }
  homePage: string // 默认首页
  layout: {
    placeholder: string // 模板页面站位符
  }
  npm: { // 依赖 npm 包
    scope: string
    src: string // 源路径
    dest: string
  }
  alias: {
    // common: string // 公共
    // layout: string // 布局
    // assets: string // 资源
    // components: string // 组件
    // pages: string // 页面
    [key: string]: string
  }
  ext: { // 扩展名
    // SFC
    wxa: string
    wxp: string
    wxc: string

    // TEMPLATE
    wxml: string
    pug: string

    // SCRIPT
    js: string
    ts: string
    wxs: string

    // STYLE
    css: string
    wxss: string
    less: string
    pcss: string
    postcss: string
    sass: string
    scss: string
    styl: string
    stylus: string

    // JSON
    json: string

    // IMAGE
    png: string
    jpg: string
    jpeg: string
    gif: string
    bmp: string
    webp: string

    // ICONFONT
    eot: string
    svg: string
    ttf: string
    woff: string

    [key: string]: string
  }
  structure: { // 构造器
    wxc: string
    wxp: string
    wxa: string
  }
  compilers: any
  plugins: any
  lint: any

  log: {
    verbose: boolean // 显示详细信息
    time: boolean // 显示时间
    level: number // 日志级别
  }
  cache: {
    // file: string
    // xcxast: string
  }
}
