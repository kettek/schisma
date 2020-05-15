import test from 'ava'
import schisma from '../src/schisma.mjs'

let numSchema = schisma({
  $type: Number
})
let indirectNumSchema = schisma({
  $typeof: [numSchema]
})
let arrayOfIndirectNumSchemas = schisma([
  indirectNumSchema
])

test('Schema of Schemas', t => {
  let o = arrayOfIndirectNumSchemas.create({populateArrays: true})
  t.deepEqual([0], o)
})
