import test from 'ava'
import schisma from '../src/schisma.mjs'

let complexSchema = schisma({
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
})

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
  }, complexSchema.create({populateArrays: true}))
})

test('Complex Object conform missing key', t => {
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
  }, complexSchema.conform({
    a: 0,
    c: [
      {
        cA: 0
      }
    ]
  }, {populateArrays: true}))
})

test('Complex Object conform unexpected key', t => {
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
  }, complexSchema.conform({
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
    ],
    d: {
      dA: 'oops',
      dB: ['oops x2']
    }
  }, {populateArrays: true}))
})
