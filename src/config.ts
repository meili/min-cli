import { Config } from './declare'

const scope = '@minui'

const config: Config = {
  title: 'MinUI',
  cli: 'min',
  filename: 'min.config.json',
  projectType: '', // in customConfig. include min.config.json and minConfig of package.json
  cwd: process.cwd(),
  prefix: 'wxc',
  src: 'src',
  dest: 'dist',
  pages: '{{src}}/pages',
  packages: 'packages', // wxc组件项目目录
  package: { // wxc组件
    src: '{{src}}', // 源路径
    dest: '{{dest}}', // 编译路径
    default: 'index' // 默认文件
  },
  homePage: 'pages/home/index', // 默认首页
  layout: {
    placeholder: '<page></page>' // 模板页面站位符
  },
  npm: { // 依赖 npm 包
    scope,
    src: 'node_modules', // 源路径
    dest: '{{dest}}/{{packages}}'
    // dest: { // 编译路径
    //   modules: 'dist/min',
    //   wxcs: 'dist/min'
    // }
  },
  alias: {
    '@': '{{src}}', // 根路径
    'common': '{{src}}/common', // 公共
    'layout': '{{src}}/common/layout', // 布局
    'assets': '{{src}}/common/assets', // 资源
    'components': '{{src}}/common/components', // 组件

    'pages': '{{pages}}' // 页面

    // 默认由 util.config 实现
    // [scope]: '{{packages}}' // 组件库
  },
  ext: { // 扩展名
    // 单文件
    wxc: '.wxc',
    wxp: '.wxp',
    wxa: '.wxa',

    // 多文件
    wxml: '.wxml',
    wxss: '.wxss',
    js: '.js',
    json: '.json',

    png: '.png',
    jpg: '.jpg',
    jpeg: '.jpeg',
    gif: '.gif',
    webp: '.webp',

    eot: '.eot',
    svg: '.svg',
    ttf: '.ttf',
    woff: '.woff',

    wxs: '.wxs',

    // 不支持 .css 扩展
    css: '.css',

    // 预编译
    less: '.less',
    pcss: '.pcss',
    postcss: '.postcss',

    sass: '.sass',
    scss: '.scss',
    stylus: '.stylus'
  },
  structure: { // 构造器
    wxc: 'Component',
    wxp: 'Page',
    wxa: 'App'
  },
  compilers: {},
  style: {
    lang: { // CSS预编译器 【当前版本不支持自定义配置】
      'less': 'less',
      'scss': 'sass',
      'sass': 'sass',
      'pcss': 'postcss',
      'postcss': 'postcss'
    },
    compile: { // 编译插件 【当前版本不支持自定义配置】
      // 'less': () => {},
      // 'sass': () => {},
      // 'postcss': () => {}
    },
    unit: {
      px2rpx: true,
      rem2rpx: true
    },
    bem: {
      use: true,
      rule: ''
    }
  },
  log: {
    verbose: true, // 显示详细信息
    time: true, // 显示时间
    level: 0 // 日志级别
  },
  cache: {
    // file: '.xcxcache',
    // xcxast: '.xcxcache'
  }
}

export default config
