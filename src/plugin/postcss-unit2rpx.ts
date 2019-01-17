import * as postcss from 'postcss'

export const postcssUnit2rpx = postcss.plugin('postcss-unit2rpx', (options: any) => {
  return root => {
    root.walkRules((rule, index) => {
      root.walkDecls(decl => {
        decl.value = decl.value.replace(/([0-9.]+)(px|rem)/ig, (match, size, unit) => {
          if (unit === 'px') { // 100px => 100rpx
            return `${size}rpx`
          } else if (unit === 'rem') { // 1rem => 100rpx
            return `${size * 100}rpx`
          }
          return match
        })
      })
    })
  }
})
