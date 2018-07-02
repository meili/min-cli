import { patchProps, patchComponentMethods, patchData, patchComponentLifecycle } from './init'

const ExtensionProperties = ['behaviors', 'relations', 'externalClasses', 'options']

function patchExtensionConfig (wxConfig: Component.Config, options: Component.Options) {
  ExtensionProperties.forEach(property => {
    let value = options[property]

    if (typeof value === 'undefined') return

    wxConfig[property] = value
  })
}

export default function createComponent (options: Component.Options, exts?: Weapp.Extends) {
  const wxConfig = {}

  patchProps(wxConfig, options.properties)
  patchComponentMethods(wxConfig, options)
  patchData(wxConfig, options.data)
  patchExtensionConfig(wxConfig, options)
  patchComponentLifecycle(wxConfig, options, exts)

  return Component(wxConfig)
}
