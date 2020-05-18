import test from 'ava'
import schisma from '../src/schisma.mjs'
import SchismaResult from '../src/schisma_result.mjs'

class MyClass {
  constructor(input) {
    if (!input) return
    if (input.a) this._a = input.a
    if (input.b) this._b = input.b
  }
  get a() {
    return this._a
  }
  get b() {
    return this._b
  }
}

let ClassSchema = schisma({
  $type: MyClass,
})

test('Class create', t => {
  t.deepEqual(
    new MyClass({a:'32', b:32}),
    ClassSchema.create({}, {a: '32', b:32})
  )
})


test('Class $unmarshal conform', t => {
  t.deepEqual(new MyClass({a:32, b: '32'}), schisma({
    $typeof: [MyClass],
    $unmarshal: d => new MyClass(d)
  }).conform({a: 32, b: '32'}))
})

test('Class $unmarshal & $validate', t => {
  let vErrors = schisma({
    $typeof: [MyClass],
    $unmarshal: d => new MyClass(d),
    $validate: d => d.a === 100
  }).validate({a: 99})

  if (vErrors.length !== 1) {
    t.fail(JSON.stringify(vErrors))
  }
  if (vErrors[0].code !== SchismaResult.INVALID) {
    t.fail(JSON.stringify(vErrors))
  }

  vErrors = schisma({
    $typeof: [MyClass],
    $unmarshal: d => new MyClass(d),
    $validate: d => d.a === 100
  }).validate({a: 100})

  if (vErrors.length > 0) {
    t.fail(JSON.stringify(vErrors))
  }
  t.pass()
})
