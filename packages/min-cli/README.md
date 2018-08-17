# Min Cli【2.x公测版】

> Min 2.x 版本新增 compilers 和 plugins 机制，通过预编译的手段让开发者可以选择喜好的开发风格去开发小程序

## 安装

``` bash
$ npm i -g @mindev/min-cli@next
```

## 从1.x迁移到2.x

- **兼容情况**
  - 2.x 版本向下兼容，如用户在 1.x 版本中使用内置的编译器和插件，升级到 min cli 2.x 版本后，请按需安装即可.
  - 2.x 版本移除内置的 `babel`、`less`、`postcss` 编译器，如需使用请安装它，例如：`npm install -D @mindev/min-compiler-babel`
  - 1.x 版本中内置的 postcss 编译器默认使用插件包括 `postcss-bem`、`precss`、`postcss-calc`，在 2.x 版本中请用户按需安装使用
  - 2.x 版本移除内置的 `unit2rpx` 插件，如需使用请安装它，例如：`npm install -D @mindev/min-plugin-unit2rpx`

- **编译器**

> min cli 2.x 版本开始，将1.x版本中内置的 `babel`、`less`、`postcss` 编译器进行了迁移改造，并且新增了 `pug`、`typescript`、`sass`、`stylus` 编译器。Min 编译器命名为 @mindev/min-compiler-{{name}}，用户可挑选喜好的编译语言并安装它即可使用

- Compilers

  - @mindev/min-compiler-pug
  - @mindev/min-compiler-babel
  - @mindev/min-compiler-typescript
  - @mindev/min-compiler-less
  - @mindev/min-compiler-postcss
  - @mindev/min-compiler-sass
  - @mindev/min-compiler-stylus

- Install

``` bash
$ cd ~/your_project_dir
$ npm install -D @mindev/min-compiler-pug
$ npm install -D @mindev/min-compiler-babel
$ npm install -D @mindev/min-compiler-less
```

- Use

``` html
<template lang="pug">
  view
    view.hello hello world！
</template>

<script lang="babel">
  export default {

  }
</script>

<style lang="less">
@w: 100px
.hello {
  width: @w;
}
</style>
```

- Config

``` js
// ~/min.config.js
module.exports = {
  ...
  compilers: {
    pug: {},
    babel: {
      sourceMaps: 'inline',
      presets: ['env'],
      plugins: [
        'syntax-export-extensions',
        'transform-class-properties',
        ...
      ]
    },
    less: {
      ...
    }
  },
  ...
}
```

- **插件**

> min cli 2.x 版本开始，将1.x版本中内置的 `unit2rpx` 插件进行了迁移改造，并且新增了 `autoprefixer`、`define`、`filesync`、`filemin`、`uglifyjs`、`imagemin` 插件。Min 插件命名为 @mindev/min-plugin-{{name}}，用户可挑选喜好的插件并安装它即可使用

- Plugins

  - @mindev/min-plugin-unit2rpx
  - @mindev/min-plugin-autoprefixer
  - @mindev/min-plugin-define
  - @mindev/min-plugin-filesync
  - @mindev/min-plugin-filemin
  - @mindev/min-plugin-uglifyjs
  - @mindev/min-plugin-imagemin

- Install

``` bash
$ cd ~/your_project_dir
$ npm install -D @mindev/min-plugin-unit2rpx
$ npm install -D @mindev/min-plugin-define
$ npm install -D @mindev/min-plugin-filesync
```

- Config

``` js
// ~/min.config.js
module.exports = {
  ...
  plugins: {
    Unit2rpxPlugin: {
      px: 1, // 1px => 1rpx
      rem: 100 // 1rem => 100rem
    },
    DefinePlugin: {
      PRODUCTION: false,
      __dev__: true
    },
    FilesyncPlugin: {
      cwd: 'src/assets',
      from: '**/*',
      filter: /\.(png|jpg|webp)$/,
      ignore: /\.(gif)$/,
      to: '/images' // sync to dist/images/
    }
  }
}
```

- **代码检测**

- Lint

  - @mindev/min-lint-eslint

- Config

``` js
// ~/min.config.js
module.exports = {
  ...
  lint: {
    eslint: true
  }
}
```

## 新特性

- **新增 @minlib/min**

> 优化原生小程序支持 mixin、wx.api promise化、intercept拦截器，似vue的computed、watch，vuex等

- **新增 @minlib/min-async-await**

> 可以让异步逻辑用同步写法实现，用同步写法代替传统的callback嵌套

## ChangeLog

- **2.0.0-beta.1**
  - 新增 compilers 编译器实现机制
  - 新增 plugins 插件实现机制
  - 新增 lint 代码检测功能
  - 修复 min dev 运行中编译错误被中断问题
  - 支持 min.config.js 配置文件

- **2.0.0-beta.2**
  - 脚手架升级 2.x 版本

- **2.0.0-beta.3**
  - 新增 originRoutes 配置，用于多文件与单文件混合开发时，获取多文件的 pages 路由

## Todo

- **2.0.0-beta.4**
  - 新增 min doctor 指令

## Tip

- **npm scope**
  - @mindev 与开发相关，例如`@mindev/min-cli`、`@mindev/min-compiler-babel`
  - @minlib 提供基础类库，例如`@minlib/min`、`@minlib/min-async-await`
  - @minui 官方MinUI组件库，例如`@minui/wxc-loading`、`@minui/wxc-toast`
