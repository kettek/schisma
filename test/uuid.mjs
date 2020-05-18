import test from 'ava'
import schisma from '../src/schisma.mjs'
import SchismaResult from '../src/schisma_result.mjs'

class UUID {
  constructor(input) {
    if (!input) return
    this.parts = input.split('-').map(v=>parseInt(v, 16))
  }
  toJSON() {
    return this.parts.map(v=>v.toString(16)).join('-')
  }
}

let UUIDSchema = schisma({
  $type: UUID,
})

test('UUID create', t => {
  t.deepEqual(
    new UUID('123e4567-e89b-12d3-a456-426614174000'),
    UUIDSchema.create({}, '123e4567-e89b-12d3-a456-426614174000')
  )
})

test('UUID create->stringify check', t => {
  let uuid = UUIDSchema.create({}, '123e4567-e89b-12d3-a456-426614174000')
  t.deepEqual(JSON.stringify('123e4567-e89b-12d3-a456-426614174000'), JSON.stringify(uuid))
})

test('UUID child stringify check', t => {
  let sch = schisma({
    uuid: UUID,
  })
  let uuid = sch.conform({uuid: '123e4567-e89b-12d3-a456-426614174000'})
  t.deepEqual({uuid: '123e4567-e89b-12d3-a456-426614174000'}, JSON.parse(JSON.stringify(uuid)))
})
