import test from 'ava'
import schisma from '../src/schisma.mjs'
import SchismaResult from '../src/schisma_result.mjs'

test.only('recursive schema', t => {
  let sch = schisma({
    name: String,
    children: {
      $required: false,
      $type: [{
        $validate: d => sch.validate(d)
      }]
    }
  })
  
  let vErrors = sch.validate({
    name: "Parent",
    children: [
      {
        name: "Child",
        children: [
          {
            name: "Grandchild",
          },
        ]
      },
    ]
  })

  if (vErrors.length === 0) {
    t.pass()
  } else {
    t.fail(vErrors)
  }
})
