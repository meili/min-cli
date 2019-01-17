import * as beautify from 'js-beautify'

const { js_beautify, html_beautify, css_beautify } = beautify

export function beautifyHtml (source: string) {
  return html_beautify(source, {
    'indent_size': 4,
    'brace_style': 'collapse',
    'indent_char': ' ',
    'preserve_newlines': true,
    // Whether existing line breaks before elements should be preserved (only works before elements, not inside tags or for text)
    // unformatted: ['a', 'span', 'img', 'code', 'pre', 'sub', 'sup', 'em', 'strong', 'b', 'i', 'u', 'strike', 'big', 'small', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    // unformatted: ['a', 'img', 'code', 'pre', 'sub', 'sup', 'em', 'strong', 'b', 'u', 'strike', 'big', 'small', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    'unformatted': [],
    // List of tags that should not be reformatted
    'indent_scripts': 'keep',
    // [keep|separate|normal]
    'eol': '\n',
    'indent_with_tabs': false,
    'max_preserve_newlines': 10,
    'wrap_line_length': 0,
    'wrap_attributes': 'auto',
    'wrap_attributes_indent_size': 2,
    'end_with_newline': false
  })
}

export function beautifyCss (source: string) {
  return css_beautify(source, {
    'end_with_newline': false,
    'indent_char': ' ',
    'indent_size': 4,
    'selector_separator_newline': true
  })
}

export function beautifyJs (source: string) {
  return js_beautify(source, {
    'brace_style': 'collapse',
    'break_chained_methods': false,
    'eval_code': false,
    'indent_char': ' ',
    'indent_level': 0,
    'indent_size': 4,
    'indent_with_tabs': false,
    'jslint_happy': false,
    'keep_array_indentation': false,
    'keep_function_indentation': false,
    'max_preserve_newlines': 10,
    'preserve_newlines': true,
    'space_before_conditional': true,
    'unescape_strings': false,
    'wrap_line_length': 0
  })
}
