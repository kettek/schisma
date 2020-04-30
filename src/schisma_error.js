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
    if (extra.errors !== undefined) this.errors = extra.errors
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

export default SchismaError