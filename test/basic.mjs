import test from 'ava'
import schisma from '../src/schisma.mjs'

test('Number',  t => t.deepEqual(0, schisma(Number).create()))
test('String',  t => t.deepEqual('', schisma(String).create()))
test('Boolean', t => t.deepEqual(false, schisma(Boolean).create()))
test('Null',    t => t.deepEqual(null, schisma(null).create()))
test('Object',  t => t.deepEqual({}, schisma({}).create()))
test('Array',   t => t.deepEqual([], schisma([]).create()))

test('Array of Numbers',  t => t.deepEqual([0], schisma([Number]).create({populateArrays: true})))
test('Array of Strings',  t => t.deepEqual([''], schisma([String]).create({populateArrays: true})))
test('Array of Booleans', t => t.deepEqual([false], schisma([Boolean]).create({populateArrays: true})))
test('Array of Nulls',    t => t.deepEqual([null], schisma([null]).create({populateArrays: true})))
test('Array of Objects',  t => t.deepEqual([{}], schisma([{}]).create({populateArrays: true})))
test('Array of Arrays',   t => t.deepEqual([[]], schisma([[]]).create({populateArrays: true})))

test('Object of Number',  t => t.deepEqual({a: 0}, schisma({a: Number}).create()))
test('Object of String',  t => t.deepEqual({a: ''}, schisma({a: String}).create()))
test('Object of Boolean', t => t.deepEqual({a: false}, schisma({a: Boolean}).create()))
test('Object of Null',    t => t.deepEqual({a: null}, schisma({a: null}).create()))
test('Object of Object',  t => t.deepEqual({a: {}}, schisma({a: {}}).create()))
test('Object of Array',   t => t.deepEqual({a: []}, schisma({a: []}).create()))

test('Number type mismatch conform',  t => t.deepEqual(32, schisma(Number).conform('32')))
test('String type mismatch conform',  t => t.deepEqual('0', schisma(String).conform(0)))
test('Boolean type mismatch conform', t => t.deepEqual(true, schisma(Boolean).conform(1)))
test('Null type mismatch conform',    t => t.deepEqual(null, schisma(null).conform(false)))
test('Object type mismatch conform',  t => t.deepEqual({}, schisma({}).conform(0)))
test('Array type mismatch conform',   t => t.deepEqual([], schisma([]).conform(0)))
