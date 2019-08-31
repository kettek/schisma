/**
 * SchismaError is the type used to create errors during schema validation.
 */
class SchismaError {
  constructor(code=0, extra) {
    this.code     = code
    if (extra.value !== undefined) this.value = extra.value
    if (extra.where !== undefined) this.where = extra.where
    if (extra.message !== undefined)  this.message  = extra.message
    if (extra.expected !== undefined) this.expected = extra.expected
    if (extra.received !== undefined) this.received = extra.received
  }
  static get UNHANDLED() {
    return 0
  }
  static get BAD_TYPE() {
    return 1
  }
  static get UNEXPECTED_KEY() {
    return 2
  }
  static get MISSING_KEY() {
    return 3
  }
  static get BAD_LENGTH() {
    return 4
  }
  static get INVALID() {
    return 5
  }
}

/**
 * Schisma represents a schema used to validate or conform an object structure.
 * It can also be used to create new objects that use the schema's defaults.
 */
class Schisma {
  constructor(root) {
    this.$type      = null
    this.$required  = false
    this.$default   = null
    this.$validate  = null
    this._understand(root)
  }
  static get Error() {
    return SchismaError
  }
  _understand(o) {
    if (Array.isArray(o)) {            // Array of some type.
      this.$type = o.map(v => new Schisma(v))
      // TODO: we need some stringified $type that converts deep arrays/objects into full k=>v pairs, kinda like JSON.stringify, but for types only.
    } else if (typeof o === 'object') {
      if (o.hasOwnProperty('$type') || o.hasOwnProperty('$validate')) { // Guaranteed SchismaConf
        this.$type      = new Schisma(o.$type).$type
        this.$validate  = o.$validate
        this.$required  = o.$required
        this.$default   = o.$default
      } else {                         // Traversable Obj.
        this.$type = {}
        for(let [k, v] of Object.entries(o)) {
          this.$type[k] = new Schisma(v)
        }
      }
    } else {                           // Primitives.
      this.$type = typeof o(0)
    }
  }
  /**
   * validate validates the provided object against the schema.
   * @param {Object} o Object to validate.
   * @param {Object} [conf] Configuration for fine-tuning what is considered an error.
   * @param {Object} [conf.allowBadLength=false] Allows arrays to be shorter than the schema defines.
   * @param {Object} [conf.allowUnexpected=false] Ignores unexpected object keys.
   * @param {Object} [conf.allowMissing=false] Ignores missing object keys.
   * @returns {{code: Number, value: Any, where: String, message: String, expected: String, received: String}[]} Array of errors
   */
  validate(o,conf={allowBadLength:false,allowUnexpected:false,allowMissing:false},dot='') {
    let errors = []
    // Validate if user has provided such a function.
    if (this.$validate) {
      let validation_error = this.$validate(o, dot)
      if (validation_error !== undefined) {
        errors.push(new SchismaError(SchismaError.INVALID, {...{message: `${dot} failed validation`, value: o, where: dot}, ...validation_error}))
      }
      return errors
    }
    // Check arrays.
    if (Array.isArray(o)) {
      if (!Array.isArray(this.$type)) {
        errors.push(new SchismaError(SchismaError.BAD_TYPE, {message: `${dot} is of wrong type`, expected: this.$type, received: 'array', value: o, where: dot}))
      } else {
        if (o.length < this.$type.length && !conf.allowBadLength) {
          errors.push(new SchismaError(SchismaError.BAD_LENGTH, {message: `${dot} is too short`, expected: this.$type.length, received: o.length, value: o, where: dot}))
        } else {
          // Check each element on o's Array against schema's type modulo schema's type length. This means we pattern match.
          for (let i = 0; i < o.length; i++) {
            errors = [...errors, ...this.$type[i%this.$type.length].validate(o[i], conf, `${dot}[${i}]`)]
          }
        }
      }
    // Check objects.
    } else if (typeof o === 'object') {
      if (!(this.$type instanceof Object)) {
        errors.push(new SchismaError(SchismaError.BAD_TYPE, {message: `${dot} is of wrong type`, expected: this.$type, received: typeof o, value:o, where: dot}))
      } else {
        // Generate a list of common keys and check if they are unexpected, missing, or fail validation.
        for (let k of new Set([...Object.keys(this.$type), ...Object.keys(o)])) {
          if (!this.$type.hasOwnProperty(k)) {
            if (!conf.allowUnexpected) {
              errors.push(new SchismaError(SchismaError.UNEXPECTED_KEY, {message: `.${k} is unexpected`, value: o[k], where: dot}))
            }
          } else if (!o.hasOwnProperty(k)) {
            if (this.$type[k].$required || !conf.allowMissing) {
              errors.push(new SchismaError(SchismaError.MISSING_KEY, {message: `.${k} is required`, expected: this.$type[k].$type, where: dot}))
            }
          } else {
            errors = [...errors, ...this.$type[k].validate(o[k], conf, `${dot}.${k}`)]
          }
        }
      }
    // Check primitives.
    } else {
      if (typeof o !== this.$type) {
        errors.push(new SchismaError(SchismaError.BAD_TYPE, {message: `${dot} is of wrong type`, expected: this.$type, received: typeof o, value: o, where: dot}))
      }
    }
    return errors
  }
  conform(o, keepBadValues) {
    // TODO: Generate a version of passed object that conforms to the schema, optionally removing unexpected keys.
  }
  create() {
    // TODO: Create an object based upon schema using defaults.
  }
}

let schA = new Schisma({
  a: Number,
  b: Symbol,
  c: [Boolean, BigInt],
  d: {
    dA: String,
  },
  f: [String, Number],
  g: {
    $type: Number,
  },
  h: String,
  i: {
    $type: Boolean,
  },
})

let objA = {
  a: 32,
  b: Symbol(100),
  c: [true, BigInt(123)],
  d: {
    dA: "hi",
    dB: 32,
  },
  f: ["string"],
  g: 30,
}

let errors = schA.validate(objA, { allowBadLength: false, allowUnexpected: false, allowMissing: false })
console.log(errors)

let parsed = schA.conform(objA)