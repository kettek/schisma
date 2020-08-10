/*
 * Copyright (c) 2020 Ketchetwahmeegwun T. Southall
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * SchismaResult is the type used to create errors and results during schema validation.
 */
class SchismaResult {
  constructor(code, extra) {
    this.code     = code
    if (extra.where !== undefined) this.where = extra.where
    if (extra.expected !== undefined) this.expected = extra.expected
    if (extra.expectedSchema !== undefined) this.expectedSchema = extra.expectedSchema
    if (extra.received !== undefined) this.received = extra.received
    if (extra.value !== undefined) this.value = extra.value
    if (extra.__typeIndex !== undefined) this.__typeIndex = extra.__typeIndex
    if (extra.errors) this.errors = extra.errors
    if (extra.results) this.results = extra.results
    if (extra.message) this.message = extra.message
  }
  isProblem() {
    if ([SchismaResult.PARTIAL_MATCH, SchismaResult.NO_MATCH].includes(this.code)) {
      return true
    }
    if ([SchismaResult.UNEXPECTED_KEY, SchismaResult.MISSING_KEY, SchismaResult.INVALID].includes(this.code)) {
      return true
    }
    return false
  }
  static get UNHANDLED() {
    return 'unhandled'
  }
  static get PARTIAL_MATCH() {
    return 'partial match'
  }
  static get EXACT_MATCH() {
    return 'exact match'
  }
  static get NO_MATCH() {
    return 'no match'
  }
  static get UNEXPECTED_KEY() {
    return 'unexpected key'
  }
  static get MISSING_KEY() {
    return 'missing key'
  }
  static get INVALID() {
    return 'invalid'
  }
  static get VALID() {
    return 'valid'
  }
}

export default SchismaResult
