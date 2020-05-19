import test from 'ava'
import schisma from '../src/schisma.mjs'

test('Number',  t => t.deepEqual(0, schisma(Number).create()))
test('String',  t => t.deepEqual('', schisma(String).create()))
test('Boolean', t => t.deepEqual(false, schisma(Boolean).create()))
test('Object',  t => t.deepEqual({}, schisma({}).create()))
test('Array',   t => t.deepEqual([], schisma([]).create()))

test('Array of Numbers',  t => t.deepEqual([0], schisma([Number]).create({populateArrays: true})))
test('Array of Strings',  t => t.deepEqual([''], schisma([String]).create({populateArrays: true})))
test('Array of Booleans', t => t.deepEqual([false], schisma([Boolean]).create({populateArrays: true})))
test('Array of Objects',  t => t.deepEqual([{}], schisma([{}]).create({populateArrays: true})))
test('Array of Arrays',   t => t.deepEqual([[]], schisma([[]]).create({populateArrays: true})))

test('Object of Number',  t => t.deepEqual({a: 0}, schisma({a: Number}).create()))
test('Object of String',  t => t.deepEqual({a: ''}, schisma({a: String}).create()))
test('Object of Boolean', t => t.deepEqual({a: false}, schisma({a: Boolean}).create()))
test('Object of Object',  t => t.deepEqual({a: {}}, schisma({a: {}}).create()))
test('Object of Array',   t => t.deepEqual({a: []}, schisma({a: []}).create()))
