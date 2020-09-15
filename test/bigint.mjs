import test from 'ava'
import schisma from '../src/schisma.mjs'

test('BigInt',  t => t.deepEqual(0n, schisma(BigInt).create()))

test('Array of BigInts',  t => t.deepEqual([0n], schisma([BigInt]).create({populateArrays: true})))

test('Object of Number',  t => t.deepEqual({a: 0n}, schisma({a: BigInt}).create()))

test('BigInt->Number type mismatch conform',  t => t.deepEqual(32n, schisma(BigInt).conform(32)))
test('BigInt->String type mismatch conform',  t => t.deepEqual(32n, schisma(BigInt).conform('32')))
test('BigInt->Boolean type mismatch conform', t => t.deepEqual(1n, schisma(BigInt).conform(true)))
