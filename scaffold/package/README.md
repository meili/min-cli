# <%= pkgName %>

> <%= description %>

## Install

``` bash
$ min install <%= npmScopeStr %><%= pkgName %>
```
<% if (false) { %>
## Usage

``` html
<<%= pkgName %> ...></<%= pkgName %>>
```

``` js
export default {
  config: {
    components: {
      '<%= pkgName %>': '<%= npmScopeStr %><%= pkgName %>'
    }
  }
}
```
<% } %>

## API

### <%= pkgNameSuffixToPascalCase %>

| 名称                  | 描述                         |
|----------------------|------------------------------|
|`prop-name`           | 描述属性的类型，默认值等         |
|`method-name`         | 描述方法的参数，返回值等         |

## ChangeLog

#### v<%= version %>（<%= time %>）

- 初始版本
