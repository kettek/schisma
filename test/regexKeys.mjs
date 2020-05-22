import test from 'ava'
import schisma from '../src/schisma.mjs'

test('Regex Matching (matches)', t => {
  let sch = schisma({
    "$/.*": [String],
    "$/yeet": [Boolean],
  })
  let obj = {
    yeet: true
  }
  let results = sch.validate(obj)
  if (results.length > 0) {
    t.fail(JSON.stringify(results))
    return
  }
  t.pass()
})

test('Regex Matching (fails)', t => {
  let sch = schisma({
    "$/.*": [String],
    "$/yeet": [Boolean],
  })
  let obj = {
    yeet: 32
  }
  let results = sch.validate(obj)
  if (results.length !== 1) {
    t.fail(JSON.stringify(results))
    return
  }
  t.pass()
})
