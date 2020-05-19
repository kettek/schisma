import test from 'ava'
import schisma from '../src/schisma.mjs'

let arraySchema = schisma([Number, Number, Number])

test('Array growth', t => t.deepEqual([1,2,0], arraySchema.conform([1,2], {growArrays: true})))
test('Array shrink', t => t.deepEqual([1,2,3], arraySchema.conform([1,2,3,4], {shrinkArrays: true})))
