import SchismaError from './schisma_error.js'
/**
 * Schisma represents a schema used to validate or conform an object structure.
 * It can also be used to create new objects that use the schema's defaults.
 */
class Schisma {
  constructor(root) {
    this.$type      = null
    this.$required  = true
    this.$default   = null
    this.$validate  = null
    this._understand(root)
  }
  /**
   * Parses a provided object into a schisma schemata.
   *
   * @param {Object} o Object to be parsed.
   */
  _understand(o) {
    if (Array.isArray(o)) {            // Array of some type.
      this.$type = o.map(v => new Schisma(v))
      // TODO: we need some stringified $type that converts deep arrays/objects into full k=>v pairs, kinda like JSON.stringify, but for types only.
    } else if (typeof o === 'object') {
      if (o instanceof Schisma) {
        this.$type     = o.$type
        this.$ctor     = o.$ctor
        this.$validate = o.$validate
        this.$required = o.$required
        this.$default  = o.$default
      } else if (o.hasOwnProperty('$type') || o.hasOwnProperty('$validate')) { // Guaranteed SchismaConf
        let sch         = new Schisma(o.$type)
        this.$type      = sch.$type
        this.$ctor      = o.$type
        this.$validate  = o.$validate
        this.$required  = o.$required
        this.$default   = o.$default || sch.$default
      } else {                         // Traversable Obj.
        this.$type = {}
        for(let [k, v] of Object.entries(o)) {
          this.$type[k] = new Schisma(v)
        }
      }
    } else {                           // Primitives.
      this.$ctor    = o
      this.$type    = typeof o()
    }
  }
  /**
   * Validates the provided object against the schema.
   * @param {Object} o Object to validate.
   * @param {Object} [conf] Configuration for fine-tuning what is considered an error.
   * @param {Object} [conf.ignoreUnexpected=false] Ignores unexpected object keys.
   * @param {Object} [conf.ignoreRequired=false] Ignores required object keys.
   * @param {Object} [conf.ignoreShortArrays=true] Ignores arrays that are shorter than the schema's array.
   * @param {Object} [conf.ignoreLongArrays=true] Ignores arrays that are longer than the schema's array.
   * @param {Object} [conf.matchArray="any"] Matches array by either "any" type contained or by a "pattern" of types.
   * @returns {{code: Number, value: Any, where: String, message: String, expected: String, received: String}[]} Array of errors
   */
  validate(o,conf={},dot='') {
    conf = {...{ignoreUnexpected:false,ignoreRequired:false,ignoreShortArrays:true,ignoreLongArrays:true,matchArray:"any"}, ...conf}
    let errors = []
    // Validate if user has provided such a function.
    if (this.$validate) {
      let validation_error = this.$validate(o, dot)
      if (validation_error !== undefined) {
        errors.push(new SchismaError(SchismaError.INVALID, {...{message: `failed validation`, value: o, where: dot}, ...validation_error}))
      }
      return errors
    }
    // Check arrays.
    if (Array.isArray(o)) {
      if (!Array.isArray(this.$type)) {
        errors.push(new SchismaError(SchismaError.BAD_TYPE, {message: `wrong type`, expected: this.$type, received: 'array', value: o, where: dot}))
      } else {
        if (o.length < this.$type.length && !conf.ignoreShortArrays) {
          errors.push(new SchismaError(SchismaError.BAD_LENGTH, {message: `wrong length`, expected: this.$type.length, received: o.length, value: o, where: dot}))
        } else if (o.length > this.$type.length && !conf.ignoreLongArrays) {
          errors.push(new SchismaError(SchismaError.BAD_LENGTH, {message: `wrong length`, expected: this.$type.length, received: o.length, value: o, where: dot}))
        }
        if (conf.matchArray == 'pattern') {    // Match explicit pattern of [type, type, ...]
          for (let i = 0; i < o.length; i++) {
            errors = [...errors, ...this.$type[i%this.$type.length].validate(o[i], conf, `${dot}[${i}]`)]
          }
        } else if (conf.matchArray == 'any') {        // Match any item in [type, type, ...]
          for (let i = 0; i < o.length; i++) {
            let match = false
            // TODO: Hueristics matching against o[i] and this.$type[i]
            for (let j = 0; j < this.$type.length; j++) {
              if (this.$type[j].validate(o[i], conf, '').length == 0) {
                match = true
                break
              }
            }
            if (!match) {
              errors.push(new SchismaError(SchismaError.BAD_TYPE, {message: `wrong types`, expected: this.$type.map(t=>t.$type).join(','), received: typeof o, value: o, where: dot}))
            }
          }
        }
      }
    // Check objects.
    } else if (typeof o === 'object') {
      if (!(this.$type instanceof Object)) {
        errors.push(new SchismaError(SchismaError.BAD_TYPE, {message: `wrong type`, expected: this.$type, received: typeof o, value:o, where: dot}))
      } else {
        // Generate a list of common keys and check if they are unexpected, missing, or fail validation.
        for (let k of new Set([...Object.keys(this.$type), ...Object.keys(o)])) {
          if (!this.$type.hasOwnProperty(k)) {
            if (!conf.ignoreUnexpected) {
              errors.push(new SchismaError(SchismaError.UNEXPECTED_KEY, {message: `.${k} is unexpected`, value: o[k], where: dot}))
            }
          } else if (!o.hasOwnProperty(k)) {
            if (this.$type[k].$required || !conf.ignoreRequired) {
              errors.push(new SchismaError(SchismaError.MISSING_KEY, {message: `.${k} is required`, expected: this.$type[k].$type, where: dot, received: 'undefined'}))
            }
          } else {
            errors = [...errors, ...this.$type[k].validate(o[k], conf, `${dot}.${k}`)]
          }
        }
      }
    // Check primitives.
    } else {
      if (typeof o !== this.$type) {
        errors.push(new SchismaError(SchismaError.BAD_TYPE, {message: `wrong type`, expected: this.$type, received: typeof o, value: o, where: dot}))
      }
    }
    return errors
  }
  /**
   * Conforms the provided object to match the schema. Mis-matched types are
   * converted to their proper types when possible.
   * @param {Object} o 
   * @param {Object} [conf] Configuration for fine-tuning how conforming works.
   * @param {Object} [conf.removeUnexpected=true] Removes unexpected object keys.
   * @param {Object} [conf.insertMissing=true] Inserts missing object keys with default values.
   * @param {Object} [conf.matchArray="any"] Matches arrays by either "any" type contained or by a "pattern" of types.
   * @param {Object} [conf.growArrays=false] Grow arrays to match the length of the schema's array.
   * @param {Object} [conf.shrinkArrays=false] Shrink arrays to match the length of the schema's array.
   * @param {Object} [conf.populateArrays=true] Populate empty arrays with default instances of their schema elements.
   */
  conform(o, conf={}, dot=``) {
    conf = {...{removeUnexpected:true, insertMissing:true, matchArray:'any', growArrays: false, shrinkArrays: false, populateArrays:true}, ...conf}
    // Check arrays.
    if (Array.isArray(o)) {
      if (!Array.isArray(this.$type)) {
        return this.create(conf)
      } else {
        let arr = []
        // Grow or shrink arrays if desired.
        if (o.length < this.$type.length && conf.growArrays) {
          let def = this.create(conf)
          arr = [...o, ...def.slice(o.length, this.$type.length)]
        } else if (o.length > this.$type.length && conf.shrinkArrays) {
          arr = [...o.slice(0, this.$type.length)]
        } else {
          arr = o
        }
        // Match explicit pattern of [type, type, ...]
        if (conf.matchArray == 'pattern') {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = this.$type[i%this.$type.length].conform(arr[i], conf, `${dot}[${i}]`)
          }
        // Match any item in [type, type, ...]
        } else if (conf.matchArray == 'any') {
          for (let i = 0; i < arr.length; i++) {
            // Find the closest potential type match.
            let matches = this.$type.map(v=>Schisma._heuristicsMatch(arr[i], v, conf))
            let bestIndex = matches.indexOf(Math.max(...matches.filter(v=>v>=0)))
            // If none is found, remove the item
            if (bestIndex <= -1 && conf.removeUnexpected) {
              arr.splice(i--, 1)
            // Otherwise conform the item to the best match.
            } else {
              arr[i] = this.$type[bestIndex].conform(arr[i], conf, `${dot}[${i}]`)
            }
          }
        }
        return arr
      }
    // Check objects.
    } else if (typeof o === 'object') {
      if (!(this.$type instanceof Object)) {
        return this.create(conf)
      } else {
        // Generate a list of common keys and check if they are unexpected, missing, or fail validation.
        let c = {}
        for (let k of new Set([...Object.keys(this.$type), ...Object.keys(o)])) {
          if (!this.$type.hasOwnProperty(k)) {
            if (!conf.removeUnexpected) {
              c[k] = o[k]
            }
          } else if (!o.hasOwnProperty(k)) {
            if (conf.insertMissing) {
              c[k] = this.$type[k].create(conf)
            }
          } else {
            c[k] = this.$type[k].conform(o[k], conf, `${dot}.${k}`)
          }
        }
        return c
      }
    // Check primitives.
    } else {
      if (typeof o !== this.$type) {
        return this.$ctor(o)
      }
      return o
    }
  }
  /**
   * Checks potential match between o(Object) and t(Schisma). Higher values represent a higher likelihood of an accurate match.
   */
  static _heuristicsMatch(o, t, conf) {
    let value = 0
    if (Array.isArray(o)) {
      if (!Array.isArray(t.$type)) {
        value--
      } else {
        for (let i = 0; i < o.length; i++) {
          let matches = t.$type.map(v=>Schisma._heuristicsMatch(o[i], v, conf))
          let bestIndex = matches.indexOf(Math.max(...matches.filter(v=>v>0)))
          if (bestIndex == -1) {
            value--
          } else {
            value++
          }
        }
      }
    } else if (o instanceof Object) {
      if (Array.isArray(t.$type) || !(t.$type instanceof Object)) {
        value--
      } else {
        for (let [k, v] of Object.entries(o)) {
          if (!t.$type.hasOwnProperty(k)) {
            value--
          } else {
            value += Schisma._heuristicsMatch(o[k], t.$type[k])
          }
        }
      }
    } else {
      if (t.$type == typeof o) {
        value++
      } else {
        value--
      }
    }
    return value
  }
  /**
   * Creates a new object that conforms to schema using computed or
   * provided default values. If there is no $default value provided for a
   * key, then whatever that key represents will be created with the
   * type's default constructor.
   *
   * @param {Object} [conf] Configuration for fine-tuning creation.
   * @param {Object} [conf.populateArrays=false] Whether or not arrays should be populated with default instances of their elements.
   * @returns {Object} object conforming to the schema's definition.
   */
  create(conf={}) {
    conf = {...{populateArrays:false},...conf}
    if (this.$default) {
      return this.$default instanceof Function ? this.$default() : Schisma._deepClone(this.$default)
    } else {
      if (Array.isArray(this.$type)) {
        if (conf.populateArrays) {
          return this.$type.map(v => v.create(conf))
        } else {
          return []
        }
      } else if (this.$type instanceof Object) {
        let defaults = {}
        for(let [k, v] of Object.entries(this.$type)) {
          defaults[k] = v.create(conf)
        }
        return defaults
      } else {
        return this.$ctor()
      }
    }
  }
  /**
   * Deep copies a value.
   */
  static _deepClone(v) {
    if (Array.isArray(v)) {
      let a = []
      for (let i = 0; i < v.length; i++) {
        a[i] = Schisma._deepClone(v[i])
      }
      return a
    } else if (v instanceof Object) {
      let o = {}
      for (let [key, value] of Object.entries(v)) {
        o[key] = Schisma._deepClone(value)
      }
      return o
    } else {
      return v
    }
  }
}

function schisma(newSchema) {
  return new Schisma(newSchema)
}
schisma.SchismaError = SchismaError

export default schisma
