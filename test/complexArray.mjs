import test from 'ava'
import schisma from '../src/schisma.mjs'

let complexSchema = schisma({
  parts: [Number],
  deepParts: [
    [Number],
  ],
})

test('Complex Array', t => {
  return t.deepEqual({
    parts: [0],
    deepParts: [
      [0],
    ],
  }, complexSchema.create({populateArrays: true}))
})

test('Complex Array parts mismatch', t => {
  return t.deepEqual({
    parts: [1],
    deepParts: [
      [0, 32, 0, 0],
    ],
  }, complexSchema.conform({
    parts: ['1'],
    deepParts: [
      [0, '32', 'whoops', {key: 'value'}],
    ],
  }, {populateArrays: true}))
})
