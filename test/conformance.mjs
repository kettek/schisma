import test from 'ava'
import schisma from '../src/schisma.mjs'

let complexSchema = schisma({
  number: Number,
  string: String,
})

test('Object conform',  t => {
  let conformed = complexSchema.conform({
    number: '32',
    string: 11,
  })

  t.deepEqual(conformed, {number: 32, string: '11'})
})

// Conforming stand-alone primitive schemas is broken. If these are contained in another schema, they conform fine.
let numberSchema = schisma(Number)
test('Number conform', t => {
  let conformed = numberSchema.conform('42')

  t.is(conformed, 42)
})

// Conforming stand-alone primitive schemas is broken. If these are contained in another schema, they conform fine.
let numberTypeSchema = schisma({
  $type: Number
})
test('Number($type) conform', t => {
  let conformed = numberTypeSchema.conform('42')

  t.is(conformed, 42)
})

test('conform complex $typeof',  t => {
  let complexAa = schisma({
    name: {
      $type: String,
      $default: 'Aa'
    },
    array: [],
  })
  let complexAb = schisma({
    name: {
      $type: String,
      $default: 'Ab'
    },
    string: String
  })

  let complexA = schisma({
    variableTypes: {
      $typeof: [complexAa, complexAb],
    }
  })

  let expectedA = {
    variableTypes: {
      name: 'Aa',
      array: [],
    }
  }
  let expectedB = {
    variableTypes: {
      name: 'Ab',
      string: ''
    }
  }
  let conformedA = complexA.conform(expectedA)
  t.deepEqual(conformedA, expectedA)

  let conformedB = complexA.conform(expectedB)
  t.deepEqual(conformedB, expectedB)
})
