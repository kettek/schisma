import SchismaError from './schisma_error.js'
/**
 * Schisma represents a schema used to validate or conform an object structure.
 * It can also be used to create new objects that use the schema's defaults.
 */
class Schisma {
  constructor(root) {
    this.$type      = null
    this.$required  = true
    this.$default   = undefined
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
      this.$typeof = [this.$type]
      // TODO: we need some stringified $type that converts deep arrays/objects into full k=>v pairs, kinda like JSON.stringify, but for types only.
    } else if (typeof o === 'object') {
      if (o instanceof Schisma) {
        this.$type     = o.$type
        this.$typeof   = [o.$type]
        this.$ctor     = o.$ctor
        this.$validate = o.$validate
        this.$required = o.$required !== undefined ? o.$required : true
        this.$default  = o.$default
      } else if (o.hasOwnProperty('$typeof')) {
        let schs        = o.$typeof.map(t => new Schisma(t))
        this.$type      = schs[0]
        this.$typeof    = schs.map(t => t.$type)
        this.$ctor      = o.$typeof
        this.$validate  = o.$validate
        this.$required  = o.$required !== undefined ? o.$required : true
        this.$default   = o.$default
      } else if (o.hasOwnProperty('$type') || o.hasOwnProperty('$validate')) { // Guaranteed SchismaConf
        let sch         = new Schisma(o.$type)
        this.$type      = sch.$type
        this.$typeof    = [this.$type]
        this.$ctor      = o.$type
        this.$validate  = o.$validate
        this.$required  = o.$required !== undefined ? o.$required : true
        this.$default   = o.$default !== undefined ? o.$default : sch.$default
      } else {                         // Traversable Obj.
        this.$type = {}
        for(let [k, v] of Object.entries(o)) {
          this.$type[k] = new Schisma(v)
        }
        this.$typeof = [this.$type]
      }
    } else {                           // Primitives.
      this.$ctor    = o
      this.$type    = typeof o()
      this.$typeof  = [this.$type]
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
   * @param {Object} [conf.flattenErrors=true] Flattens errors into a single array.
   * @returns {{code: Number, value: Any, where: String, message: String, expected: String, received: String}[]} Array of errors
   */
  validate(o, conf={}, dot='') {
    conf = {...{ignoreUnexpected:false,ignoreRequired:false,ignoreShortArrays:true,ignoreLongArrays:true,matchArray:"any",flattenErrors:true}, ...conf}
    let errors = this._validate(o, conf, dot)
    if (conf.flattenErrors) {
      let toReturn = []
      let addChildren=err => {
        if (err.errors) {
          let nextErrors = err.errors
          delete err.errors
          toReturn.push(err)
          nextErrors.forEach(addChildren)
        } else {
          toReturn.push(err)
        }
      }
      errors.forEach(addChildren)
      return toReturn
    }
    return errors
  }
  _validate(o,conf={},dot='') {
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
      let newErrors = []
      for (let $type of this.$typeof) {
        let matchErrors = []
        if (!Array.isArray($type)) {
          matchErrors.push(new SchismaError(SchismaError.BAD_TYPE, {message: `wrong array type`, expected: $type, received: 'array', value: o, where: dot}))
        } else {
          if (o.length < $type.length && !conf.ignoreShortArrays) {
            matchErrors.push(new SchismaError(SchismaError.BAD_LENGTH, {message: `wrong length`, expected: $type.length, received: o.length, value: o, where: dot}))
          } else if (o.length > $type.length && !conf.ignoreLongArrays) {
            matchErrors.push(new SchismaError(SchismaError.BAD_LENGTH, {message: `wrong length`, expected: $type.length, received: o.length, value: o, where: dot}))
          }
          if (conf.matchArray == 'pattern') {    // Match explicit pattern of [type, type, ...]
            for (let i = 0; i < o.length; i++) {
              matchErrors = [...matchErrors, ...$type[i%$type.length]._validate(o[i], conf, `${dot}.${i}`)]
            }
          } else if (conf.matchArray == 'any') {        // Match any item in [type, type, ...]
            for (let i = 0; i < o.length; i++) {
              let itemMatchErrors = []
              // TODO: Hueristics matching against o[i] and this.$type[i]
              for (let j = 0; j < $type.length; j++) {
                let validationErrors = $type[j]._validate(o[i], conf, `${dot}.${i}`)
                if (validationErrors.length === 0) {
                  itemMatchErrors = []
                  break
                } else {
                  itemMatchErrors = [...itemMatchErrors, ...validationErrors]
                }
              }
              matchErrors = [...matchErrors, ...itemMatchErrors]
            }
          }
        }
        if (matchErrors.length === 0) {
          newErrors = []
          break
        } else {
          newErrors = [...newErrors, ...matchErrors]
        }
      }
      errors = [...errors, ...newErrors]
    // Check objects.
    } else if (typeof o === 'object') {
      let newErrors = []
      for (let $type of this.$typeof) {
        let matchErrors = []
        if (!($type instanceof Object)) {
          matchErrors.push(new SchismaError(SchismaError.BAD_TYPE, {message: `wrong object type`, expected: $type, received: typeof o, value:o, where: dot}))
        } else {
          // Generate a list of common keys and check if they are unexpected, missing, or fail validation.
          for (let k of new Set([...Object.keys($type), ...Object.keys(o)])) {
            if (!$type.hasOwnProperty(k)) {
              if (!conf.ignoreUnexpected) {
                matchErrors.push(new SchismaError(SchismaError.UNEXPECTED_KEY, {message: `.${k} is unexpected`, value: o[k], where: `${dot}.${k}`}))
              }
            } else if (!o.hasOwnProperty(k)) {
              if ($type[k].$required && !conf.ignoreRequired) {
                matchErrors.push(new SchismaError(SchismaError.MISSING_KEY, {message: `.${k} is required`, expected: $type[k].$type, where: `${dot}.${k}`, received: 'undefined'}))
              }
            } else {
              matchErrors = [...matchErrors, ...$type[k]._validate(o[k], conf, `${dot}.${k}`)]
            }
          }
        }
        // We gucci
        if (matchErrors.length === 0) {
          newErrors = []
          break
        } else {
          newErrors = [...newErrors, new SchismaError(SchismaError.BAD_TYPE, {
            message: `incorrect type`, where: dot, received: o,
            errors: matchErrors
          })]
        }
      }
      errors = [...errors, ...newErrors]
    // Check primitives.
    } else {
      if (!this.$typeof.find(type => typeof o === (type instanceof Schisma ? type.$type : type))) {
        errors.push(new SchismaError(SchismaError.BAD_TYPE, {message: `wrong type`, expected: this.$typeof.map(type => type instanceof Schisma ? type.$type : type), received: typeof o, value: o, where: dot}))
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
  conform(o, conf={}) {
    conf = {...{removeUnexpected:true, insertMissing:true, matchArray:'any', growArrays: false, shrinkArrays: false, populateArrays:true, flattenErrors: false}, ...conf}
    let validationErrors = this.validate(o, {...{
      ignoreShortArrays: false, ignoreLongArrays: false
    }, ...conf})
    this._conformFromErrors(o, validationErrors, conf)
    return o
  }
  _conformFromErrors(data, errs, conf, fixedDotPaths=new Set()) {
    if (!errs) return
    for (let err of errs) {
      let allKeys = err.where.split('.')

      allKeys = allKeys[0]===''?allKeys.slice(1):allKeys

      let endKey = allKeys.pop()

      if (fixedDotPaths.has(err.where)) continue

      let dataTarget = allKeys.reduce((o, i) => o[i], data)

      if (err.errors) {
        if (err.code === SchismaError.BAD_TYPE) {
          this._conformFromErrors(data, err.errors, conf, fixedDotPaths)
        }
      } else {
        let schemaTarget = allKeys.reduce(
          (o, i) => {
            // Limit by schema's array length. NOTE: This might not respect pattern/any matching!
            if (Array.isArray(o)) {
              return (o[Number(i)%o.length]).$type
            }
            return o[i].$type
          },
          this.$type
        )
        if (err.code === SchismaError.UNEXPECTED_KEY && conf.removeUnexpected) {
          delete dataTarget[endKey]
        } else if (err.code === SchismaError.MISSING_KEY && schemaTarget[endKey].$required && !conf.ignoreRequired) {
          dataTarget[endKey] = schemaTarget[endKey].create(conf, dataTarget[endKey])
        } else if (err.code === SchismaError.BAD_TYPE) {
          dataTarget[endKey] = schemaTarget[endKey].create(conf, dataTarget[endKey])
        } else if (err.code === SchismaError.BAD_LENGTH && (conf.shrinkArrays || conf.growArrays)) {
          let defaultArray = schemaTarget[endKey].create(conf, dataTarget[endKey])
          if (dataTarget[endKey].length > defaultArray.length && conf.shrinkArrays) {
            dataTarget[endKey] = [...dataTarget[endKey].slice(0, defaultArray.length)]
          } else if (dataTarget[endKey].length < defaultArray.length && conf.growArrays) {
            dataTarget[endKey] = [...dataTarget[endKey], ...defaultArray.slice(dataTarget[endKey].length, defaultArray.length)]
          }
        } else if (err.code === SchismaError.INVALID) {
          dataTarget[endKey] = schemaTarget[endKey].create(conf, dataTarget[endKey])
        } else {
          // unhandled
        }
      }
      fixedDotPaths.add(endKey)
    }

  }
  /**
   * Creates a new object that conforms to schema using computed or
   * provided default values. If there is no $default value provided for a
   * key, then whatever that key represents will be created with the
   * type's default constructor.
   *
   * @param {Object} [conf] Configuration for fine-tuning creation.
   * @param {Object} [conf.populateArrays=false] Whether or not arrays should be populated with default instances of their elements.
   * @param {*} [data] Original data that is used for primitive constructors. This allows types to be interpreted as one another when possible.
   * @returns {Object} object conforming to the schema's definition.
   */
  create(conf={}, data=null) {
    conf = {...{populateArrays:false},...conf}

    if (this.$default !== undefined) {
      return this.$default instanceof Function ? this.$default() : Schisma._deepClone(this.$default)
    } else {
      if (Array.isArray(this.$type)) {
        if (conf.populateArrays) {
          return this.$type.map(v => v.create(conf))
        } else {
          return []
        }
      } else if (this.$type instanceof Object) {
        let $type = this.$type
        if ($type instanceof Schisma) {
          $type = $type.$type
        }
        let defaults = {}
        for(let [k, v] of Object.entries($type)) {
          if (v.$required) {
            defaults[k] = v.create(conf)
          }
        }
        return defaults
      } else {
        return this.$ctor(data)
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
