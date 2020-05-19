import test from 'ava'
import schisma from '../src/schisma.mjs'

test('simple createProperty', t => {
  let childSch = schisma({
    anArray: [Number]
  })
  let parentSch = schisma({
    children: [{
      $typeof: [childSch]
    }]
  })
  t.deepEqual([childSch.create({populateArrays: true})], parentSch.createProperty('children', {populateArrays: true}))
})

test('double $typeof createProperty', t => {
  let childSch = schisma({
    anArray: [Number]
  })
  let childSch2 = schisma({
    aString: String
  })

  let parentSch = schisma({
    children: {
      $typeof: [childSch, childSch2]
    }
  })
  t.deepEqual(childSch2.create(), parentSch.createProperty('children.$1'))
})

test('deep createProperty', t => {
  let parentSch = schisma({
    levelA: {
      levelAa: {
        levelB: String,
      },
      levelAb: {
        levelB: Number,
      }
    }
  })
  t.deepEqual('', parentSch.createProperty('levelA.levelAa.levelB'))
  t.deepEqual(undefined, parentSch.createProperty('levelA.levelAa.levelB.levelC'))
})
