(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.schisma = factory());
}(this, function () { 'use strict';

  /**
   * SchismaError is the type used to create errors during schema validation.
   */
  class SchismaError {
    constructor(code=0, extra) {
      this.code     = code;
      if (extra.value !== undefined) this.value = extra.value;
      if (extra.where !== undefined) this.where = extra.where;
      if (extra.message !== undefined)  this.message  = extra.message;
      if (extra.expected !== undefined) this.expected = extra.expected;
      if (extra.received !== undefined) this.received = extra.received;
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
      this.$type      = null;
      this.$required  = false;
      this.$default   = null;
      this.$validate  = null;
      this._understand(root);
    }
    /**
     * Parses a provided object into a schisma schemata.
     *
     * @param {Object} o Object to be parsed.
     */
    _understand(o) {
      if (Array.isArray(o)) {            // Array of some type.
        this.$type = o.map(v => new Schisma(v));
        this.$default = this.$type.map(v => v.$default);
        // TODO: we need some stringified $type that converts deep arrays/objects into full k=>v pairs, kinda like JSON.stringify, but for types only.
      } else if (typeof o === 'object') {
        if (o instanceof Schisma) {
          this.$type     = o.$type;
          this.$ctor     = o.$ctor;
          this.$validate = o.$validate;
          this.$required = o.$required;
          this.$default  = o.$default;
        } else if (o.hasOwnProperty('$type') || o.hasOwnProperty('$validate')) { // Guaranteed SchismaConf
          let sch         = new Schisma(o.$type);
          this.$type      = sch.$type;
          this.$ctor      = o.$type;
          this.$validate  = o.$validate;
          this.$required  = o.$required;
          this.$default   = o.$default || sch.$default;
        } else {                         // Traversable Obj.
          this.$type = {};
          this.$default = {};
          for(let [k, v] of Object.entries(o)) {
            this.$type[k] = new Schisma(v);
            this.$default[k] = this.$type[k].$default;
          }
        }
      } else {                           // Primitives.
        this.$ctor    = o;
        this.$default = o();
        this.$type    = typeof this.$default;
      }
    }
    /**
     * Validates the provided object against the schema.
     * @param {Object} o Object to validate.
     * @param {Object} [conf] Configuration for fine-tuning what is considered an error.
     * @param {Object} [conf.ignoreUnexpected=false] Ignores unexpected object keys.
     * @param {Object} [conf.ignoreMissing=false] Ignores missing object keys.
     * @param {Object} [conf.matchArray="any"] Matches array by either "any" type contained or by a "pattern" of types.
     * @param {Object} [conf.matchArrayLength=false] Array length must match schema's array length.
     * @returns {{code: Number, value: Any, where: String, message: String, expected: String, received: String}[]} Array of errors
     */
    validate(o,conf={ignoreUnexpected:false,ignoreMissing:false,matchArray:"any",matchArrayLength:false},dot='') {
      let errors = [];
      // Validate if user has provided such a function.
      if (this.$validate) {
        let validation_error = this.$validate(o, dot);
        if (validation_error !== undefined) {
          errors.push(new SchismaError(SchismaError.INVALID, {...{message: `failed validation`, value: o, where: dot}, ...validation_error}));
        }
        return errors
      }
      // Check arrays.
      if (Array.isArray(o)) {
        if (!Array.isArray(this.$type)) {
          errors.push(new SchismaError(SchismaError.BAD_TYPE, {message: `wrong type`, expected: this.$type, received: 'array', value: o, where: dot}));
        } else {
          if (o.length != this.$type.length && conf.matchArrayLength) { // Check for length differences if desired.
            errors.push(new SchismaError(SchismaError.BAD_LENGTH, {message: `wrong length`, expected: this.$type.length, received: o.length, value: o, where: dot}));
          } else if (conf.matchArray == 'pattern') {    // Match explicit pattern of [type, type, ...]
            for (let i = 0; i < o.length; i++) {
              errors = [...errors, ...this.$type[i%this.$type.length].validate(o[i], conf, `${dot}[${i}]`)];
            }
          } else if (conf.matchArray == 'any') {        // Match any item in [type, type, ...]
            for (let i = 0; i < o.length; i++) {
              let match = false;
              for (let j = 0; j < this.$type.length; j++) {
                if (this.$type[j].validate(o[i], conf, '').length == 0) {
                  match = true;
                  break
                }
              }
              if (!match) {
                errors.push(new SchismaError(SchismaError.BAD_TYPE, {message: `wrong types`, expected: this.$type.map(t=>t.$type).join(','), received: typeof o, value: o, where: dot}));
              }
            }
          }
        }
      // Check objects.
      } else if (typeof o === 'object') {
        if (!(this.$type instanceof Object)) {
          errors.push(new SchismaError(SchismaError.BAD_TYPE, {message: `wrong type`, expected: this.$type, received: typeof o, value:o, where: dot}));
        } else {
          // Generate a list of common keys and check if they are unexpected, missing, or fail validation.
          for (let k of new Set([...Object.keys(this.$type), ...Object.keys(o)])) {
            if (!this.$type.hasOwnProperty(k)) {
              if (!conf.ignoreUnexpected) {
                errors.push(new SchismaError(SchismaError.UNEXPECTED_KEY, {message: `.${k} is unexpected`, value: o[k], where: dot}));
              }
            } else if (!o.hasOwnProperty(k)) {
              if (this.$type[k].$required || !conf.ignoreMissing) {
                errors.push(new SchismaError(SchismaError.MISSING_KEY, {message: `.${k} is required`, expected: this.$type[k].$type, where: dot, received: 'undefined'}));
              }
            } else {
              errors = [...errors, ...this.$type[k].validate(o[k], conf, `${dot}.${k}`)];
            }
          }
        }
      // Check primitives.
      } else {
        if (typeof o !== this.$type) {
          errors.push(new SchismaError(SchismaError.BAD_TYPE, {message: `wrong type`, expected: this.$type, received: typeof o, value: o, where: dot}));
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
     * @param {Object} [conf.matchArrayLength=false] Resizes arrays that do not match the length of the schema's array.
     */
    conform(o, conf={removeUnexpected:true, insertMissing:true, matchArray:'any', matchArrayLength:false}, dot=``) {
      // Check arrays.
      if (Array.isArray(o)) {
        if (!Array.isArray(this.$type)) {
          return this.$default
        } else {
          let arr = [];
          if (conf.matchArrayLength) {
            arr = [...o.slice(0, this.$default.length), ...this.$default.slice(o.length)];
          } else {
            arr = [...o];
          }
          if (conf.matchArray == 'pattern') {    // Match explicit pattern of [type, type, ...]
            // Check each element on o's Array against schema's type modulo schema's type length. This means we pattern match.
            for (let i = 0; i < arr.length; i++) {
              arr[i] = this.$type[i%this.$type.length].conform(arr[i], conf, `${dot}[${i}]`);
            }
          } else if (conf.matchArray == 'any') {        // Match any item in [type, type, ...]
            for (let i = 0; i < arr.length; i++) {
              let match = false;
              for (let j = 0; j < this.$type.length; j++) {
                if (this.$type[j].validate(arr[i], conf, '').length == 0) {
                  match = true;
                  break
                }
              }
              if (!match) {
                arr.splice(i--, 1);
              }
            }
          }
          return arr
        }
      // Check objects.
      } else if (typeof o === 'object') {
        if (!(this.$type instanceof Object)) {
          return this.$default
        } else {
          // Generate a list of common keys and check if they are unexpected, missing, or fail validation.
          let c = {};
          for (let k of new Set([...Object.keys(this.$type), ...Object.keys(o)])) {
            if (!this.$type.hasOwnProperty(k)) {
              if (!conf.removeUnexpected) {
                c[k] = o[k];
              }
            } else if (!o.hasOwnProperty(k)) {
              if (conf.insertMissing) {
                c[k] = (this.$type[k].$default instanceof Function ? this.$type[k].$default() : this.$type[k].$default);
              }
            } else {
              c[k] = this.$type[k].conform(o[k], conf, `${dot}.${k}`);
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
     * Creates a new object that conforms to schema using computed or
     * provided default values. If there is no $default value provided for a
     * key, then whatever that key represents will be created with the
     * type's default constructor.
     *
     * @param {Object} [conf] Configuration for fine-tuning creation.
     * @param {Object} [conf.populateArrays=false] Whether or not arrays should be populated with default instances of their elements.
     * @returns {Object} object conforming to the schema's definition.
     */
    create(conf={populateArrays:false}) {
      if (Array.isArray(this.$type)) {
        let a = [];
        if (conf.populateArrays == true) {
          for (let i = 0; i < this.$type.length; i++) {
            a[i] = this.$type[i].create(conf);
          }
        }
        return a
      } else if (this.$type instanceof Object) {
        let o = {};
        for (let [k, v] of Object.entries(this.$type)) {
          o[k] = this.$type[k].create(conf);
        }
        return o
      } else {
        return this.$default instanceof Function ? this.$default() : this.$default
      }
    }
  }

  function schisma(newSchema) {
    return new Schisma(newSchema)
  }
  schisma.SchismaError = SchismaError;

  return schisma;

}));
