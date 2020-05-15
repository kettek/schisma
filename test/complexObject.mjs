import test from 'ava'
import schisma from '../src/schisma.mjs'

test('Complex Object', t => {
  return t.deepEqual({
    a: 0,
    b: {
      bA: '',
      bB: [
        false
      ]
    },
    c: [
      {
        cA: 0
      }
    ]
  }, schisma({
    a: Number,
    b: {
      bA: String,
      bB: [
        Boolean
      ]
    },
    c: [
      {
        cA: Number,
      }
    ]
  }).create({populateArrays: true}))
})
