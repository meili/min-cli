import * as marked from 'marked'
import * as highlight from 'highlight.js'
import { dom } from '../util'

const htmlparser = require('htmlparser2')
const renderer = new marked.Renderer()
const { DomUtils: domUtils } = htmlparser

export const md = {
  marked,
  md2html
}

// 标签上添加class=`md-tag`
function tagAddClassName (source: string) {
  let element = dom.make(source)
  let elems = domUtils.getElementsByTagName(() => true, element, true, [])
  elems.forEach((elem: any) => {
    elem.attribs = elem.attribs || {}
    elem.attribs.class = [elem.attribs.class || '', `md-${elem.name}`].filter(name => !!name).join(' ')
  })
  return domUtils.getOuterHTML(element)
}

// table
renderer.table = (header: string, body: string): string => {
  return `<table class="md-table">
    ${tagAddClassName(header)}
    ${tagAddClassName(body)}
  </table>`
}

// h1 - h6
renderer.heading = (text: string, level: number, raw: string): string => {
  return `<h${level} class="md-h${level}">${text}</h${level}>`
}

// code
renderer.code = (code: string, language: string, isEscaped: boolean): string => {
  code = highlight.highlightAuto(code).value
  return `<code class="lang-${language} md-code">${code}</code>`
}

// init
marked.setOptions({
  renderer,
  highlight (code: string, lang: string) {
    return highlight.highlightAuto(code, [lang]).value
  }
})

// MD 转 HTML
function md2html (source: string, isFormat: boolean) {
  source = md.marked(source)

  // 格式化：换行、缩进
  if (isFormat) {
    source = source.replace(/\n/g, '<br/>')
    source = source.replace(/[ ]{2}/g, '<span class="md--tab"></span>')
  }
  return source
}
