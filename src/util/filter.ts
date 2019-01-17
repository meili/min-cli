export function filterPrefix (prefix: string = '') {
  prefix = (prefix || '').trim()
  if (/[-]+$/.test(prefix)) { // wxc- => wxc-
    return prefix
  } else if (prefix !== '') { // wxc => wxc-
    return `${prefix}-`
  }
  return prefix
}

export function filterNpmScope (scope: string = '') {
  scope = (scope || '').trim()
  if (scope === '') {
    return ''
  }
  if (!scope.startsWith('@')) { // minui => @minui
    scope = `@${scope}`
  }
  if (!scope.endsWith('/')) { // @minui => @minui/
    scope = `${scope}/`
  }
  return scope
}
