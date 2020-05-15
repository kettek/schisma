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
test.failing('Number conform', t => {
  let conformed = numberSchema.conform('42')

  t.is(conformed, 42)
})

// Conforming stand-alone primitive schemas is broken. If these are contained in another schema, they conform fine.
let numberTypeSchema = schisma({
  $type: Number
})
test.failing('Number($type) conform', t => {
  let conformed = numberTypeSchema.conform('42')

  t.is(conformed, 42)
})
