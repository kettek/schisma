import test from 'ava'
import schisma from '../src/schisma.mjs'

let VariableChildASchema = schisma({
  type: 'child a',
  aData: {
    $type: String,
  }
})
let ChildBDataASchema = schisma({
  aData: Number
})
let ChildBDataBSchema = schisma({
  bData: String
})
let VariableChildBSchema = schisma({
  type: 'child b',
  data: {
    $typeof: [ChildBDataASchema, ChildBDataBSchema],
  }
})

let ContainerSchema = schisma({
  variableChildren: [{
    $typeof: [VariableChildASchema, VariableChildBSchema]
  }]
})

test('deep schema conform', t => {
  let expected = {
    variableChildren: [
      {
        type: 'child a',
        aData: 'a string'
      },
      {
        type: 'child b',
        data: {
          aData: 32,
        }
      },
      {
        type: 'child b',
        data: {
          bData: 'b string'
        }
      }
    ]
  }

  let bogus = {
    variableChildren: [
      {
        type: 'child a',
        aData: 'a string'
      },
      {
        type: 'child b',
        data: {
          aData: '32'
        }
      },
      {
        type: 'child b',
        data: {
          bData: 'string'
        }
      }
    ]
  }
  return t.deepEqual(expected, ContainerSchema.conform(expected))
})
