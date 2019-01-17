import { LangTypes, CompileType } from '../declare'
import { getInnerHTML } from '../util'
const htmlparser = require('htmlparser2')

/**
 * 将 source 转换成 dom 节点树
 *
 * @param {string} source
 * @returns
 */
function make (source: string) {
  let handler = new htmlparser.DomHandler()
  let parser = new htmlparser.Parser(handler, {
    lowerCaseAttributeNames: false
  })

  parser.write(source)
  parser.done()
  return handler.dom
}

/**
 * 获得单文件模块dom树
 *
 * @param {*} parentElem
 * @param {string} module
 * @returns
 */
function getSFM (parentElem: any, module: string) {
  let elem = htmlparser.DomUtils.getElementsByTagName(module, parentElem, true, [])[0]
  let code = ''
  let lang = ''
  let compileType: CompileType | undefined

  if (elem) {
    // code = htmlparser.DomUtils.getInnerHTML(elem)
    code = getInnerHTML(elem)
    lang = elem.attribs.lang

    let langType = LangTypes[`.${lang}`]
    compileType = langType ? langType.compileType : undefined
  }
  return {
    code,
    lang,
    compileType
  }
}

/**
 * 获得单文件组件dom树
 *
 * @param {string} source
 * @returns
 */
function getSFC (source: string) {
  let elem = make(source)
  return {
    template: getSFM(elem, 'template'),
    style: getSFM(elem, 'style'),
    script: getSFM(elem, 'script')
  }
}

export const dom = {
  make,
  getSFM,
  getSFC
}
