# Min

> Min2.x 优化原生小程序支持 mixin、wx.api promise化、intercept 拦截器、似vue的computed、watch等

## 安装

- **CLI工具**

``` bash
$ npm i -g @mindev/min-cli@2.0.0-beta.1
```

- **基础库**

``` bash
$ cd ~/your_project_dir
$ npm i --save @minlib/min
$ npm i --save @minlib/minx
$ npm i --save @minlib/min-wxapi
$ npm i --save @minlib/min-async-await
```

## 创建项目

- [创建小程序应用](https://meili.github.io/min/docs/min-cli/app-project/index.html)
- [创建小程序组件库](https://meili.github.io/min/docs/min-cli/wxc-project/index.html)

`注：` 已有小程序项目可跳过此步骤，请前往 从 Min 1.x 迁移到 2.x 升级文档

## 使用

### 一、使用 mixin

- **定义一个 sayHello mixin 对象**

``` js
// ~/mixins/sayHello.js
export default {
  onShow () {
    console.log('onShow in sayHello')
  },

  onHide () {
    console.log('onHide in sayHello')
  },

  methods: {
    sayHello (name) {
      wx.showToast({
        title: `say hello`
      })
      console.log(`${name} say hello`)
    }
  }
}

```

- **在任何的 .wxp 文件里混入**

```html
// ~/pages/home/index.wxp
<template>
  <!-- 省略... -->
</template>

<script>
  import sayHello from  './mixins/sayHello'

  // min.Page 是页面构造器
  // min 对象是由 min.init({global: true}) 设置可全局访问的
  export default {
    mixins: [sayHello],

    onShow () {
      this.sayHello('lingxiao')
    }
  }
</script>

<style>
  /* 省略... */
</style>
```

### 二、注册全局 Component、mixin

> 将公共基础组件放置全局模板内，并提供全局的mixin函数，通过 min dev 编译后让每个页面都能直接控制其组件实例

- **安装示例中用到的 MinUI 组件**

``` bash
$ cd ~/your_project_dir
# 安装 UI 组件
$ npm install --save @minui/wxc-loading
$ npm install --save @minui/wxc-toast
```

- **创建 mixin**

``` js
// 这里以 loading mixin 举例
// ~/mixins/loading.js
export default {
  onLoad () {
    console.log('init loading')
  },

  onShow () {
    // 获取组件实例
    this.$loading = this.selectComponent('#loading')
    this.$toast = this.selectComponent('#toast')
  },

  methods: {
    // 定义一个显示 loading 的 mixin 函数
    showLoading () {
      this.$loading.show()
    },
    // 定义一个隐藏 loading 的 mixin 函数
    hideLoading () {
      this.$loading.hide()
    }
  }
}
```

- **在 app.wxa 内放置公共模板、注册全局 Component 和 mixin**

``` html
// 全局模板
<template>
  <view>
    <!-- wxp template -->
    <page></page>

    <!-- global component -->
    <wxc-loading id="loading"></wxc-loading>
    <wxc-toast id="toast"></wxc-toast>
  </view>
</template>

// app.js 逻辑 和 app.json 配置，以及包括 globalMin 配置。
<script>
import Min from '@minlib/min'

// 引用 mixin
import loading from './mixins/loading'
import toast from './mixins/toast'

// 注册全局 mixin
Min.mixin([loading, toast])

export default {
    // app.json 配置
    config: {
      ...
    },
    // 全局 min 配置
    globalMin: {
      // 经 min dev 编译后合并到每个 page.json 的配置
      config: {
        // 注册组件
        usingComponents: {
          'wxc-loading': '@minui/wxc-loading',
          'wxc-toast': '@minui/wxc-toast'
        }
      }
    },
    ...
  }
</script>

<style>
  /* 省略... */
</style>
```

- **在任意的 .wxp 里可直接访问**

> 经 min dev 编译后，全局 mixin 已混入到各个 .wxp 页面中

``` js
export default {
  onShowLoading () {
    // 调用 ~/mixins/loading.js 中的 showLoading 方法
    this.showLoading() // 显示 loading

    setTimeout(() => {
      this.hideLoading() // 隐藏 loading
    }, 2000)
  },
  onHideLoading () {
    // 调用 ~/mixins/loading.js 中的 hideLoading 方法
    this.hideLoading() // 隐藏 loading
  }
}
```

## 使用 async/await

- **在 app.wxa 中**

``` js
// 使用 es7 的 async、await
import '@minlib/min-async-await'
```

- **在 page.wxp 中**

``` js
export default {
  methods: {
    async getData () {

      try {
        // wx.request 用 min.request 代替 ，支持promise
        let data = await min.request({
          url: 'http://mce.mogucdn.com/ajax/get/3?pid=104985'
        })
        console.log(data)
      } catch (err) {
        console.err('request error：', err)
      }
    }
  }
}
```

## Minx
> 类 vuex 状态管理器

### **在 app.wxa 中**

``` js
import Min from '@minlib/min'
import Minx from '@minlib/minx'
```

```js
// 注册插件
Min.use(Minx)
```

```js
// 创建一个 store
const store = new Minx.Store({
  state: {
    count: 1
  },
  mutations: {
    increment (state) {
      state.count++
    }
  }
})
```

```js
// 将 store 挂在 app 构造器选项中
export default {
    store,
    config: {...},
    globalData: {...},
    onLaunch () => {}
}
```

### **在 page.wxp 中**

``` js
import { mapState } from '@minlib/minx'

export default {
  computed: {
    ...mapState({
      count: state => state.count
    })
  },
  methods: {
    increment () {
      this.$store.commit('increment')
    }
  }
}
```

``` html
<template>
  <view>{{count}}</view>
</template>
```

`注` 更多使用姿势请参考 [vuex 文档](https://vuex.vuejs.org/)

## wx.api
> 所有 wx.api 接口可通过 min.api 访问，并支持异步接口 promise 化

### **在 app.wxa 中**

```js
import '@minlib/min-async-await'
import Min from '@minlib/min'
import WxApi from '@minlib/min-wxapi'
```

```js
// 注册插件
Min.use(WxApi)
```

``` js
// 创建一个WxApi
const wxApi = new WxApi({
  promisify: true, // 使用 promise 化
  requestfix: true, // request 请求优化
  interceptors: [], // 拦截器
  noPromiseAPI: []
})
```

```js
// 将 wxApi 挂在 app 构造器选项中
export default {
    wxApi,
    config: {...},
    globalData: {...},
    onLaunch () => {}
}
```

### **在 page.wxp 中**

``` js
export default {
  getData1 () {
    const { request } = this.$wxApi

    // 返回一个 Promise
    const promise = request('http://mce.mogucdn.com/ajax/get/3?pid=104985')
    promise.then((data) => {
      console.log(data)
    })
  }

  async getData2 () {
    const { request } = this.$wxApi

    // 使用 async/await
    const data = await request('http://mce.mogucdn.com/ajax/get/3?pid=104985')
    console.log(data)
  }
}
```

### min.intercept 拦截器格式

``` js
export default (min) => {
  // Add a min.request interceptor.
  min.intercept('request', {
    // 发出请求前的回调函数
    before (options, api) {
      // 对所有request请求中的OBJECT参数对象统一附加时间戳属性
      options.data = {
        ...(options.data || {}),
        timestamp: +new Date()
      }
      console.log('request options: ', options)

      return options
    },

    // 请求成功后的回调函数
    success (res, options, api) {
      // 可以在这里对收到的响应数据对象进行加工处理
      console.log('request success: ', res)

      return res
    },

    //请求失败后的回调函数
    fail (err, options, api) {
      console.log('request fail: ', err)

      return err
    },

    // 请求完成时的回调函数(请求成功或失败都会被执行)
    complete (res, options, api) {
      console.log('request complete: ', res)

      return res
    },
  })
}
```

## ChangeLog

- **2.0.0**
  - 支持 mixin
  - 支持 全局访问 min 变量
  - 支持 全局注册 Component、mixin
  - 支持 min.api 接口 promise 化
  - 支持 min.intercept 拦截器
  - 优化 wx.request 并发次数限制

- **2.0.2**
  - 增加 似 vue 的 computed
  - 增加 似 vue 的 watch

- **2.0.4**
  - 修复 data 属性可以作为一个函数
  - 修复 在页面和组件上无法自定义一个方法

- **2.0.5**
  - 修复 app.wxa 支持自定义 method 方法，建议自定义方法放在 methods 对象里管理
  - 优化 Min.mixin 支持混合多个，多个使用数组传递
  - 修复 组件properties接受动态数据更新失败问题

- **2.0.6**
  - 修复 组件内不能使用 Behavior 问题

## Tip

- min cli 2.x 版本开始支持
- 支持 wx.api promise 化，前提是依赖 `@minlib/min-async-await`
