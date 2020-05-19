import test from 'ava'
import schisma from '../src/schisma.mjs'
import SchismaResult from '../src/schisma_result.mjs'

test('$type Number',  t => t.deepEqual(0, schisma({$type: Number}).create()))
test('$type String',  t => t.deepEqual('', schisma({$type: String}).create()))
test('$type Boolean', t => t.deepEqual(false, schisma({$type: Boolean}).create()))
test('$type Object',  t => t.deepEqual({}, schisma({$type: {}}).create()))
test('$type Array',   t => t.deepEqual([], schisma({$type: []}).create()))

test('$type Array of Numbers',  t => t.deepEqual([0], schisma({$type: [Number]}).create({populateArrays: true})))
test('$type Array of Strings',  t => t.deepEqual([''], schisma({$type: [String]}).create({populateArrays: true})))
test('$type Array of Booleans', t => t.deepEqual([false], schisma({$type: [Boolean]}).create({populateArrays: true})))
test('$type Array of Objects',  t => t.deepEqual([{}], schisma({$type: [{}]}).create({populateArrays: true})))
test('$type Array of Arrays',   t => t.deepEqual([[]], schisma({$type: [[]]}).create({populateArrays: true})))

test('$type Object of Number',  t => t.deepEqual({a: 0}, schisma({$type: {a: Number}}).create()))
test('$type Object of String',  t => t.deepEqual({a: ''}, schisma({$type: {a: String}}).create()))
test('$type Object of Boolean', t => t.deepEqual({a: false}, schisma({$type: {a: Boolean}}).create()))
test('$type Object of Object',  t => t.deepEqual({a: {}}, schisma({$type: {a: {}}}).create()))
test('$type Object of Array',   t => t.deepEqual({a: []}, schisma({$type: {a: []}}).create()))

test('$typeof Number',  t => t.deepEqual(0, schisma({$typeof: [Number]}).create()))
test('$typeof String',  t => t.deepEqual('', schisma({$typeof: [String]}).create()))
test('$typeof Boolean', t => t.deepEqual(false, schisma({$typeof: [Boolean]}).create()))
test('$typeof Object',  t => t.deepEqual({}, schisma({$typeof: [{}]}).create()))
test('$typeof Array',   t => t.deepEqual([], schisma({$typeof: [[]]}).create()))

test('$typeof Array of Number',  t => t.deepEqual([0], schisma({$typeof: [[Number]]}).create({populateArrays: true})))
test('$typeof Array of String',  t => t.deepEqual([''], schisma({$typeof: [[String]]}).create({populateArrays: true})))
test('$typeof Array of Boolean', t => t.deepEqual([false], schisma({$typeof: [[Boolean]]}).create({populateArrays: true})))
test('$typeof Array of Object',  t => t.deepEqual([{}], schisma({$typeof: [[{}]]}).create({populateArrays: true})))
test('$typeof Array of Array',   t => t.deepEqual([[]], schisma({$typeof: [[[]]]}).create({populateArrays: true})))


test('$typeof String||Number',  t => t.deepEqual('', schisma({$typeof: [String,Number]}).create()))
test('$typeof String||String',  t => t.deepEqual('', schisma({$typeof: [String,String]}).create()))
test('$typeof String||Boolean', t => t.deepEqual('', schisma({$typeof: [String,Boolean]}).create()))
test('$typeof String||Object',  t => t.deepEqual('', schisma({$typeof: [String,{}]}).create()))
test('$typeof String||Array',   t => t.deepEqual('', schisma({$typeof: [String,[]]}).create()))

test('$typeof Number||String',  t => t.deepEqual(0, schisma({$typeof: [Number,String]}).create()))
test('$typeof Boolean||String', t => t.deepEqual(false, schisma({$typeof: [Boolean,String]}).create()))
test('$typeof Object||String',  t => t.deepEqual({}, schisma({$typeof: [{},String]}).create()))
test('$typeof Array||String',   t => t.deepEqual([], schisma({$typeof: [[],String]}).create()))

test('$validate always true', t => {
  let vErrors = schisma({
    $type: Number,
    $validate: v => true
  }).validate()
  if (vErrors.length <= 0) {
    t.pass()
  } else {
    t.fail(JSON.stringify(vErrors))
  }
})

test('$validate always false', t => {
  let vErrors = schisma({
    $type: Number,
    $validate: v => false
  }).validate()
  if (vErrors.length > 0) {
    t.pass(JSON.stringify(vErrors))
  } else {
    t.fail('must be false')
  }
})

test('$create with default', t => {
  let o = schisma({
    $type: String,
    $default: 'Default String',
  }).create()
  t.is(o, 'Default String')
})

test('$required=true', t => {
  let vErrors = schisma({
    $type: {
      a: {
        $type: Number,
        $required: true,
      }
    },
  }).validate({})

  if (vErrors.length < 1) {
    t.fail('incorrect amount of errors returned')
  } else {
    if (vErrors[0].code !== SchismaResult.MISSING_KEY) {
      t.fail('incorrect error code')
    } else {
      t.pass()
    }
  }
})

test('$required=false', t => {
  let vErrors = schisma({
    $type: {
      a: {
        $type: Number,
        $required: false,
      }
    },
  }).validate({})

  if (vErrors.length === 0) {
    t.pass()
  } else {
    t.fail('no errors should have been returned')
  }
})
