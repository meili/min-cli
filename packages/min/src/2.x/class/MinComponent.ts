import Min from './Min'
import { warn } from '../util'
import { initProps } from '../init'

export default class MinComponent extends Min implements Component.Context {

  $page?: Page.Context = null// in Current Page

  $properties: Weapp.Properties = Object.create(null)
  _properties: Weapp.Properties = Object.create(null)
  readonly _isComponent: boolean = true

  constructor (options: Component.Options, exts?: Weapp.Extends) {
    super(options, exts)

    if (process.env.NODE_ENV !== 'production' && !(this instanceof MinComponent)) {
      warn('MinComponent is a constructor and should be called with the `new` keyword')
    }
  }

  $init () {
    if (this._isInit) return

    initProps(this)
    super.$init()
    this._initPropDef()
  }

  private _initPropDef () {
    const propsDef: any = {}
    propsDef.get = function () {
      return this._properties
    }

    if (process.env.NODE_ENV !== 'production') {
      propsDef.set = function () {
        warn(`$properties is readonly.`, this)
      }
    }
    Object.defineProperty(this, '$properties', propsDef)
  }
}
