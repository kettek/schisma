import test from 'ava'
import schisma from '../src/schisma.mjs'

const primitives = [
  Number, BigInt, String, Boolean, schisma.Schisma.Null
]

test('Primitives creation', t => {
  let r
  for (let primitive of primitives) {
    r = t.deepEqual(primitive(''), schisma(primitive).create())
    if (!r) {
      return r
    }
  }
  return r
})

test('Primitives to Primitives conformance', t => {
  let r
  for (let primitive of primitives) {
    for (let primitive2 of primitives) {
      let a = {
        type: typeof primitive(1),
        value: primitive(1),
      }
      let b = {
        type: typeof primitive2(1),
        value: primitive2(1),
      }
      r = t.deepEqual(a, schisma({type: String, value: primitive}).conform(b))
      if (!r) {
        return r
      }
    }
  }
  return r
})

test('Array of mixed Primitives conformance', t => {
  let r
  let container = []
  let containerArrayTypes = []
  for (let primitive of primitives) {
    containerArrayTypes.push(primitive)
  }
  let containerSchema = schisma(containerArrayTypes)
  r = t.deepEqual([0, 0n, '', false], containerSchema.conform([0, 0n, '', false], {matchArray: 'pattern'}))
  return r
})

test('Array of $typeof primitives', t => {
  let schema = schisma([{
    $typeof: primitives,
  }])
  let mixedArray = []
  for (let primitive of primitives) {
    mixedArray.push(primitive(1))
  }

  return t.deepEqual([1, 1n, '1', true, null], schema.conform(mixedArray))
})

test('Array of arrays of $typeof primitives', t => {
  let schema = schisma([[{
    $typeof: primitives,
  }]])
  let mixedArray = []
  for (let i = 0; i < primitives.length; i++) {
    mixedArray[i] = []
    for (let primitive of primitives) {
      mixedArray[i].push(primitive(1))
    }
  }

  return t.deepEqual([[1, 1n, '1', true, null], [1, 1n, '1', true, null], [1, 1n, '1', true, null], [1, 1n, '1', true, null], [1, 1n, '1', true, null]], schema.conform(mixedArray))
})
