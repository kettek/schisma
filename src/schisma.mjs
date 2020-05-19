import SchismaResult from './schisma_result.mjs'
/**
 * Schisma represents a schema used to validate or conform an object structure.
 * It can also be used to create new objects that use the schema's defaults.
 */
class Schisma {
  constructor(root) {
    this.$typeof = []
    this.$required  = true
    this._understand(root)
  }
  /**
   * Parses a provided object into a schisma schemata.
   *
   * @param {Object} o Object to be parsed.
   */
  _understand(o) {
    if (o instanceof Schisma) {
      // Decompose o into this.
      for (let key of Object.keys(o)) {
        this[key] = o[key]
      }
    } else if (Array.isArray(o)) {
      this.$typeof    = [o.map(t=>new Schisma(t))]
      this.__type     = 'Array'
    } else if (typeof o === 'object') {
      if (o.$typeof !== undefined || o.$type !== undefined) {
        if (o.$typeof !== undefined) {
          this.$typeof = o.$typeof.map(t=>new Schisma(t))
        } else if (o.$type !== undefined) {
          this.$typeof = [new Schisma(o.$type)]
        }
        if (o.$default !== undefined) {
          this.$default = o.$default
        }
        if (o.$required !== undefined) {
          this.$required = o.$required
        }
        if (o.$validate !== undefined) {
          this.$validate = o.$validate
        }
        if (o.$unmarshal !== undefined) {
          this.$unmarshal = o.$unmarshal
        }
        this.__type = 'SchismaObject'
      } else {
        this.$typeof[0] = {}
        for (let key of Object.keys(o)) {
          this.$typeof[0][key] = new Schisma(o[key])
        }
        this.__type = 'Object'
      }
    } else if (typeof o === 'function') { // Constructable type (Number, class, etc.)
      this.$typeof  = [o]
      this.__type   = 'Class'
    } else {
      // Decompose primitives as type and default.
      switch(typeof o) {
        case 'number':
          this.$default = o
          this.$typeof  = [Number]
        break;
        case 'string':
          this.$default = o
          this.$typeof  = [String]
        break;
        case 'boolean':
          this.$default = o
          this.$typeof  = [Boolean]
        break;
      }
      this.__type = 'Primitive'
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
   * @param {Object} [conf.filterNonErrors=true] Filters out non error results.
   * @returns {{code: Number, value: Any, where: String, message: String, expected: String, received: String}[]} Array of errors
   */
  validate(o, conf={}, dot='') {
    conf = {...{ignoreUnexpected:false,ignoreRequired:false,ignoreShortArrays:true,ignoreLongArrays:true,matchArray:"any",flattenErrors:true, filterNonErrors: true, }, ...conf}

    let results = this._validate(o, conf, dot)
    let errors = results.errors ? results.errors : [results] // $validate requires [results]
    if (conf.filterNonErrors) {
      errors = errors.filter(r => r.isProblem())
    }
    if (conf.flattenErrors) {
      let toReturn = []
      let addChildren=err => {
        if (err.errors) {
          let nextErrors = err.errors
          err.errors.forEach(e=>e.where=`.${err.where}.${e.where}`)
          delete err.errors
          //delete err.results
          toReturn.push(err)
          nextErrors.forEach(addChildren)
        } else {
          toReturn.push(err)
        }
      }
      errors.forEach(addChildren)
      toReturn = toReturn.filter(e=>e.code!==SchismaResult.PARTIAL_MATCH)
      return toReturn
    }
    return errors
  }
  _validate(o,conf={},dot='') {
    if (this.$unmarshal !== undefined) {
      o = this.$unmarshal(o)
    }
    if (this.$validate !== undefined) {
      let result = this.$validate(o, dot)
      if (result !== undefined && result !== true) {
        if (typeof result === 'object') {
          return new SchismaResult(SchismaResult.INVALID, {
            ...{value: o, where: dot},
            ...result
          })
        } else {
          return new SchismaResult(SchismaResult.INVALID, {
            value: o, where: dot
          })
        }
      }
      return new SchismaResult(SchismaResult.VALID, {
        value: o,
        where: dot
      })
    }
    let typesResults = []
    for (let typeIndex = 0; typeIndex < this.$typeof.length; typeIndex++) {
      let type = this.$typeof[typeIndex]
      if (type instanceof Schisma) {            // Schisma object
        let checkResults = type._validate(o, conf, dot)
        checkResults.__typeIndex = typeIndex
        typesResults.push(checkResults)
        continue
      } else if (Array.isArray(type)) {         // Array of Schisma
        if (!Array.isArray(o)) {
          typesResults.push(new SchismaResult(SchismaResult.NO_MATCH, {
            where: `${dot}`,
            expected: 'array',
            received: typeof o,
            value: o,
            __typeIndex: typeIndex,
          }))
          continue
        }
        let matchResults = [], matchErrors = []
        // Check array indices versus each of our own types.
        for (let index = o.length-1; index >= 0; index--) {
          // Get unexpected indices for long arrays.
          if (index > type.length-1 && !conf.ignoreLongArrays) {
            matchErrors.push(new SchismaResult(SchismaResult.UNEXPECTED_KEY, {
              where: index
            }))
            continue
          }
          let checkResults = []
          for (let arrayTypeIndex = 0; arrayTypeIndex < type.length; arrayTypeIndex++) {
            checkResults.push(type[arrayTypeIndex]._validate(o[index], conf, `${index}`))
            checkResults.__typeIndex = arrayTypeIndex
          }
          let bestResult = this._getBestResult(checkResults)
          if (bestResult.isProblem()) {
            matchErrors.push(bestResult)
          } else {
            matchResults.push(bestResult)
          }
        }
        // Get missing indices for short arrays.
        if (o.length < type.length && !conf.ignoreShortArrays) {
          for (let i = o.length; i < type.length; i++) {
            matchErrors.push(new SchismaResult(SchismaResult.MISSING_KEY, {
              where: i
            }))
          }
        }
        typesResults.push(new SchismaResult(matchErrors.length > 0 ? SchismaResult.PARTIAL_MATCH : SchismaResult.EXACT_MATCH, {
          where: `${dot}`,
          errors: matchErrors,
          results: matchResults,
          __typeIndex: typeIndex,
        }))
        continue
      } else if (typeof type === 'object') {    // key=>value object
        if (typeof o !== 'object') {
          typesResults.push(new SchismaResult(SchismaResult.NO_MATCH, {
            where: `${dot}`,
            expected: 'object',
            received: typeof o,
            value: o,
            __typeIndex: typeIndex,
          }))
          continue
        }
        let sharedKeys = new Set([...Object.keys(type), ...Object.keys(o)])
        let matchResults = [], matchErrors = []
        for (let key of sharedKeys) {
          if (type[key] === undefined) {
            if (conf.ignoreUnexpected) continue
            matchErrors.push(new SchismaResult(SchismaResult.UNEXPECTED_KEY, {
              where: `${key}`,
              received: o[key],
            }))
          } else if (o[key] === undefined) {
            if (!type[key].$required || conf.ignoreRequired) continue
            matchErrors.push(new SchismaResult(SchismaResult.MISSING_KEY, {
              where: `${key}`,
            }))
          } else {
            let checkResults = type[key]._validate(o[key], conf, `${key}`)
            if (checkResults.isProblem()) {
              matchErrors.push(checkResults)
            } else {
              matchResults.push(checkResults)
            }
          }
        }
        if (matchErrors.length > 0) {
          typesResults.push(new SchismaResult(SchismaResult.PARTIAL_MATCH, {
            where: `${dot}`,
            errors: matchErrors,
            results: matchResults,
            __typeIndex: typeIndex,
          }))
        } else {
          typesResults.push(new SchismaResult(SchismaResult.EXACT_MATCH, {
            where: `${dot}`,
            errors: matchErrors,
            results: matchResults,
            __typeIndex: typeIndex,
          }))
        }
        continue
      } else if (typeof type === 'function') {  // Primitive or Class
        if (typeof o !== typeof this.create() && !(o instanceof type)) {
          typesResults.push(new SchismaResult(SchismaResult.NO_MATCH, {
            where: `${dot}`,
            expected: type,
            received: typeof o,
            __typeIndex: typeIndex,
            value: o,
          }))
        } else {
          typesResults.push(new SchismaResult(SchismaResult.EXACT_MATCH, {
            where: `${dot}`,
            __typeIndex: typeIndex,
          }))
        }
        continue
      } else {
        throw "unhandled (this shouldn't happen)"
      }
    }
    //
    return this._getBestResult(typesResults)
  }
  _getBestResult(results) {
    let heuristics = results.map(r=>this._getHeuristics(r))
    let bestValue = heuristics.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0)
    return results[bestValue]
  }
  _getHeuristics(results) {
    let h = 0

    if (results.code === SchismaResult.PARTIAL_MATCH) {
      if (results.results) {
        for (let r of results.results) {
          h += this._getHeuristics(r)
        }
      }
      if (results.errors) {
        for (let r of results.errors) {
          h += this._getHeuristics(r)
        }
      }
    } else if (results.code === SchismaResult.EXACT_MATCH) {
      h += 1000
      if (results.results) {
        for (let r of results.results) {
          h += this._getHeuristics(r)
        }
      }
    } else if (results.code === SchismaResult.NO_MATCH) {
      h -= 1000
    } else if (results.isProblem()) {
      h -= 1
    } else {
      h += 1
    }

    return h
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
   * @param {Object} [conf.populateArrays=false] Populate empty arrays with default instances of their schema elements.
   */
  conform(o, conf={}) {
    conf = {...{removeUnexpected:true, insertMissing:true, matchArray:'any', growArrays: false, shrinkArrays: false, populateArrays: false, flattenErrors: false}, ...conf}
    let results = this.validate(o, {...{
      ignoreShortArrays: !conf.growArrays, ignoreLongArrays: !conf.shrinkArrays, filterNonErrors: false,
    }, ...conf})
    o = this._conformFromErrors(o, results, conf)
    return o
  }
  _conformFromErrors(data, errs, conf, fixedDotPaths=new Set()) {
    if (this.$unmarshal) {
      data = this.$unmarshal(data)
    }
    for (let err of errs) {
      // Welcome to the Dept. of Redundancy.
      if (err.where === '') {
        if (err.code === SchismaResult.PARTIAL_MATCH) {
          let targetSchema = this.$typeof[0]
          data = targetSchema.$typeof[err.__typeIndex]._conformFromErrors(data, err.errors, conf, fixedDotPaths)
        } else if (err.code === SchismaResult.NO_MATCH) {
          let targetSchema = this.$typeof[err.__typeIndex]
          if (typeof targetSchema === 'function') { // Primitive or base class
            try {
              data = targetSchema(data)
            } catch(e) {
              data = new targetSchema(data)
            }
          } else {
            data = targetSchema.create(conf, data)
          }
        } else if (err.code === SchismaResult.UNEXPECTED_KEY) {
          return undefined
        } else if (err.code === SchismaResult.MISSING_KEY) {
          let targetSchema = this.$typeof[0]
          data = targetSchema.create(conf)
        }
      } else {
        if (err.code === SchismaResult.PARTIAL_MATCH) {
          let targetSchema = this.$typeof[0][err.where]
          data[err.where] = targetSchema.$typeof[err.__typeIndex]._conformFromErrors(data[err.where], err.errors, conf, fixedDotPaths)
        } else if (err.code === SchismaResult.NO_MATCH) {
          let targetSchema = this.$typeof[err.__typeIndex][err.where]
          if (typeof targetSchema === 'function') { // Primitive or base class
            try {
              data[err.where] = targetSchema(data[err.where])
            } catch(e) {
              data[err.where] = new targetSchema(data[err.where])
            }
          } else {
            data[err.where] = targetSchema.create(conf, data[err.where])
          }
        } else if (err.code === SchismaResult.UNEXPECTED_KEY) {
          // Where can be a number or a string depending on array or object.
          if (typeof err.where === 'number') {
            data.splice(err.where, 1)
          } else {
            delete data[err.where]
          }
        } else if (err.code === SchismaResult.MISSING_KEY) {
          let targetSchema = this.$typeof[0][err.where]
          data[err.where] = targetSchema.create(conf)
        }
      }
    }
    return data
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
  create(conf={}, data) {
    conf = {...{populateArrays:false},...conf}
    if (this.$default !== undefined) {
      return this.$default instanceof Function ? this.$default(data) : Schisma._deepClone(this.$default)
    }
    if (this.$unmarshal !== undefined) {
      return this.$unmarshal(data)
    }
    let type = this.$typeof[0]

    if (type instanceof Schisma) {
      return type.create(conf, data)
    } else if (Array.isArray(type)) {
      if (conf.populateArrays) {
        return type.map(v => v.create(conf))
      } else {
        return []
      }
    } else if (typeof type === 'object') {
      let o = {}
      for (let [k, v] of Object.entries(type)) {
        o[k] = v.create(conf)
      }
      return o
    } else if (typeof type === 'function') {
      if (data === undefined) {
        if (type === String) {
          return type('')
        } else if (type === Number) {
          return type(0)
        } else if (type === Boolean) {
          return type(false)
        }
      }
      if (type === String || type === Number || type === Boolean) {
        return type(data)
      }
      try {
        data = type(data)
      } catch(e) {
        data = new type(data)
      }
      return data
    }
    return 'FIXME'
  }
  /**
   * Creates a new target property of the schema. This corresponds to the
   * schema structure.
   * 
   * @example
   *     let sch = schisma({a: { B: 0 }})
   *     sch.createProperty('a') // => { B: 0 }
   *     sch.createProperty('a.B') // => 0
   * @example
   *     let sch = schisma({ variadic: { $typeof: [String, Number] } })
   *     sch.createProperty('variadic.$0') // => ''
   *     sch.createProperty('variadic.$1') // => 0
   * @example
   *     let sch = schisma({a: { string: String }})
   *     sch.createProperty('a.string', {}, 'test') // => 'test'
   * @param {String} which Which property to create. Follows dot-syntax.
   * @param {Object} conf see create().
   * @param {*} data data with which to pass to the target's constructor.
   * @returns {Object} object conforming to the schema's definition.
   */
  createProperty(which='', conf={}, data) {
    if (which === '') {
      return this.create(conf, data)
    }
    let key, nextWhich, targetSchema

    [key, nextWhich] = which.split(/\.(.+)/)

    if (key[0] === '$') {
      targetSchema = this.$typeof[Number(key.substring(1))]
    } else {
      targetSchema = this.$typeof[0]
      if (targetSchema) {
        targetSchema = targetSchema[key]
      }
    }
    if (!targetSchema) {
      // throw...?
      return undefined
    }
    return targetSchema.createProperty(nextWhich, conf, data)
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
schisma.SchismaResult = SchismaResult

export default schisma
