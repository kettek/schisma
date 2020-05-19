import test from 'ava'
import schisma from '../src/schisma.mjs'

test('Date create', t => {
  t.deepEqual(Date('1991'), schisma(Date).create({}, '1991'))
})
test('new Date $unmarshal create', t => {
  t.deepEqual(new Date('1991'), schisma({
    $type: Date,
    $unmarshal: d => new Date(d)
  }).create({}, '1991'))
})


test('Date $unmarshal conform', t => {
  t.deepEqual(new Date('1991'), schisma({
    $typeof: [Date],
    $unmarshal: d => new Date(d)
  }).conform('1991'))
})

test('Date $unmarshal validate', t => {
  let vErrors = schisma({
    $typeof: [Date],
    $unmarshal: d => new Date(d),
  }).validate('1991')

  if (vErrors.length <= 0) {
    t.pass()
  } else {
    t.fail(JSON.stringify(vErrors))
  }
})
