# Schisma
Schisma is a zero-dependency object schema creator, validator, conformer, and object instantizer.

## Features

### Schema Creation
Creation of new schemas is easy.

```
const schisma = require('schisma')

let mySchema = schisma({
  name: String,
  age: {
    $type: Number,
    $default: () => new Date%104,
  },
  owns: {
    apples: Number,
    cats: [{
      hairless: Boolean,
      age: {
        $type: Number,
        $validate: (v) => {
          if (v > 38) {
            return {expected: '<=38', received: v}
          }
        },
      },
    }],
  },
})
```

#### Schema Definition Format
Objects passed to schisma can be declared a variety of ways.

  * As a primitive type.
	* As a containing object.
  * As a schisma-style object.
  * As an Array of any of the previous.

##### Primitive Types
The simplest way of declaring the value a key is supposed to represent is with a primitive type.

```
{
  name: String,
  age:  Number,
}
```

##### Containing Objects
Objects can be used to compose more complex schemas. The key-value pairs can use any of the standard methods outlined earlier.

```
{
  mouse: {
		manufacturer: String,
    buttons: Number,
		dpi: Number,
	},
}
```

##### Shisma-style Object
A Schisma-style object can also be used.

```
{
  $type: Number,
  $default: 20,
}
```
Unlike the other value declarations, schisma-style objects are how you can provide validation and default value generation.

  * **$type** *<Any>* - May be a primitive type, an array, or another object, as per the schisma formatting rules.
  * **[$default]** *<Any|Function>* - The default value to use when inserting value or generating a default object. If it is a function, then the return value of said function is used.
  * **[$required]** *<Boolean>* - Whether the value should be considered as required for validation and conforming. *Defaults to true*
  * **[$validate]** *<Function(value,where)>* - The function used to validate the value. May return an object that is merged with the resulting SchismaError with any of the following fields:
    * **[value]** - The value of the entry. *Defaults to the object's original value*
    * **[where]** - Where in the tree the error occurred. *Defaults to the full object path*
    * **[message]** - Message of the error. *Defaults to 'failed validation'*
    * **[expected]** - Type expected to be seen.
    * **[received]** - Received type instead of the expected type.
```
{
  mouse: {
		manufacturer: {
			$type: String,
      $default: "Grojitech",
      $validate: v => {
				switch(v) {
          case 'Grojitech':
          case 'Bricoshift':
          case 'Tacerr':
          case 'Loresair:
            return
          default:
            return {expected: 'Grojitech, Bricoshift, Tacerr, or Loresair'}
				}
      },
		},
    buttons: {
      $type: Number,
      $default: () => { return new Date%2400 },
      $validate: v => {
        if (v < 1 || v > 10) {
          return {expected: 'greater than 1 and less than 10'}
        }
      }
    },
    dpi: {
      $type: Number,
      $required: true,
    }
	},
}
```

### Schema Validation
A Schisma object can be used to validate provided objects.

```
let myPersonhood = {
  name: 'OXXO',
  height: 180,
  owns: {
    cats: [
      {
        hairless: true,
        age: 400,
      },
      {
        hairless: false,
        age: 10,
      },
      {
        hairless: 'maybe',
        age: 20,
      },
    ],
  },
}

mySchema.validate(myPersonhood)
/* Returns:
[ SchismaError {
    code: 3,
    where: '',
    message: '.age is required',
    expected: 'number',
    received: 'undefined' },
  SchismaError {
    code: 3,
    where: '.owns',
    message: '.apples is required',
    expected: 'number',
    received: 'undefined' },
  SchismaError {
    code: 5,
    value: 400,
    where: '.owns.cats[0].age',
    message: 'failed validation',
    expected: '<=38',
    received: 400 },
  SchismaError {
    code: 1,
    value: 'maybe',
    where: '.owns.cats[2].hairless',
    message: 'wrong type',
    expected: 'boolean',
    received: 'string' },
  SchismaError {
    code: 2,
    value: 180,
    where: '',
    message: '.height is unexpected' }
]
*/
```

Options can also be passed to validate:

```
mySchema.validate(myPersonhood, {ignoreUnexpected: true, ignoreMissing: true})
/* Returns:
[ SchismaError {
    code: 5,
    value: 400,
    where: '.owns.cats[0].age',
    message: 'failed validation',
    expected: '<=38',
    received: 400 },
  SchismaError {
    code: 1,
    value: 'maybe',
    where: '.owns.cats[2].hairless',
    message: 'wrong type',
    expected: 'boolean',
    received: 'string' }
]
*/
```

### Schema Conforming
Schisma can also conform an object to itself.

```
let conformedPerson = mySchema.conform(myPersonhood)
/* Returns:
{ name: 'OXXO',
  age: 89,
  owns:
   { apples: 0,
     cats:
      [ { hairless: true, age: 400 },
        { hairless: false, age: 10 },
        { hairless: true, age: 20 } ] } }
*/
```

Just like validate, conform can also take options to adjust the output.
```
let conformedPerson2 = mySchema.conform(myPersonhood, {removeUnexpected: false, insertMissing: false})
/* Returns:
{ name: 'OXXO',
  owns:
   { cats:
      [ { hairless: true, age: 400 },
        { hairless: false, age: 10 },
        { hairless: true, age: 20 } ] },
  height: 180 }
*/
```

### Schema Default Object Creation
Schisma can create a default object that conforms to its schema.

```
let newPerson = mySchema.create()
/* Returns:
{ name: '',
  age: 96, <-- randomized!
  owns: { apples: 0, cats: [ { hairless: false, age: 0 } ] } }
*/
```
