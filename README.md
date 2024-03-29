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
  * As a null value.
  * As a containing object.
  * As a schisma-style object.
  * As a Schisma instance.
  * As an Array of any of the previous.

##### Primitive Types
The simplest way of declaring the value a key is supposed to represent is with a primitive type.

```
{
  name: String,
  age:  Number,
}
```

##### Null Value
Null values can be used to declare a field to be null or, if as part of a $typeof Array, that it can be null or otherwise.

```
{
  alwaysNull: null,
  age: {
    $typeof: [Number, null]
  }
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

###### Regular expression key matching
Regular expressions can also be used via the special `$/` key prefix. These allow schemas to receive arbitrary keys that map to concrete types. The value of these regex keys **must** always be an array of desired types.

```
{
  "$/.*": [Number],
}
```

Multiple regular expressions can be used. Matching attempts will be done in order of declaration.

```
{
  "$/*": [Number],
  "$/(.*)key": [String],
}
```

Regular keys may be mixed freely and take priority over regex matching.

```
{
  "$/*": [Number],
  "$/(.*)key": [String],
  myProperty: Boolean,
}
```


##### Schisma-style Object
A Schisma-style object can also be used.

```
{
  $type: Number,
  $default: 20,
}
```

```
{
  $typeof: [Number, String],
  $default: 20,
}
```

Unlike the other value declarations, schisma-style objects are how you can provide validation and default value generation.

  * **$type** *<Any>* - May be a primitive type, an array, or another object, as per the schisma formatting rules.
  * **$typeof** [*<Any>*] - An array of any of the types allowed within `$type`. This limits the given field/object's type to be one of the provided types. If `$type` and `$typeof` are used in the same declaration, `$type` will be ignored.
  * **[$default]** *<Any|Function>* - The default value to use when inserting a value or generating a default object. If it is a function, then the return value of said function is used.
  * **[$required]** *<Boolean>* - Whether the value should be considered as required for validation and conforming. *Defaults to true*
  * **[$validate]** *<Function(value,where)>* - The function used to validate the value. May return an object that is merged with the resulting SchismaError with any of the following fields. Additionally, if a plain string is returned, it is used as the *message* field.
    * **[value]** - The value of the entry. *Defaults to the object's original value*
    * **[where]** - Where in the tree the error occurred. *Defaults to the full object path*
    * **[message]** - Message of the error.
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
##### Schisma Instance
Schisma instances can also be used as values.

```
let ChildSchema = schisma({
  childPropA: Number,
  childPropB: String,
})

let ParentSchema = schisma({
  child: ChildSchema,
  children: [ChildSchema],
})
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
[
  SchismaResult { code: 'missing key', where: 'age' },
  SchismaResult { code: 'missing key', where: 'owns.apples' },
  SchismaResult {
    code: 'no match',
    where: 'owns.cats.2.hairless',
    expected: [Function: Boolean],
    received: 'string',
    value: 'maybe',
    __typeIndex: 0
  },
  SchismaResult {
    code: 'invalid',
    where: 'owns.cats.0.age',
    expected: '<=38',
    received: 400,
    value: 400
  },
  SchismaResult {
    code: 'unexpected key',
    where: 'height',
    received: 180
  }
]
*/
```

Options can also be passed to validate.

| option | value | default | description
|-|-|-|-|
| **ignoreUnexpected** | `Boolean` | *false* | Ignores unexpected object keys.
| **ignoreRequired**    | `Boolean` | *false* | Ignores required object keys.
| **ignoreShortArrays** | `Boolean` | *true* | Ignores arrays that are shorter than the schema's array.
| **ignoreLongArrays** | `Boolean` | *true* | Ignores arrays that are longer than the schema's array.
| **flattenErrors**    | `Boolean` | *true*  | Flattens all errors to return as a single array rather than heirarchically.
| **filterNonErrors**  | `Boolean` | *true*  | Filters out non error results.


```
mySchema.validate(myPersonhood, {ignoreUnexpected: true, ignoreRequired: true})
/* Returns:
[
  SchismaResult {
    code: 'no match',
    where: 'owns.cats.2.hairless',
    expected: [Function: Boolean],
    received: 'string',
    value: 'maybe',
    __typeIndex: 0
  },
  SchismaResult {
    code: 'invalid',
    where: 'owns.cats.0.age',
    expected: '<=38',
    received: 400,
    value: 400
  }
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

| option | value | default | description
|-|-|-|-|
| **removeUnexpected** | `Boolean` | *true*  | Removes unexpected object keys.
| **insertMissing**    | `Boolean` | *true*  | Inserts missing object keys with default values.
| **growArrays**       | `Boolean` | *false* | Grow arrays to match the length of the schema's array.
| **shrinkArrays**     | `Boolean` | *false* | Shrink arrays to match the length of the schema's array.
| **populateArrays**   | `Boolean` | *false*  | Populate empty arrays with default instances of their schema elements.

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
{ name: '', age: 75, owns: { apples: 0, cats: [] } }
*/
```

Just like validate and conform, create can take options to adjust object creation.

| option | value | default | description
|-|-|-|-|
| **populateArrays**    | `Boolean` | *false* | Populate arrays with default instances of their schema elements.

```
let newPerson = mySchema.create({populateArrays: false})
/* Returns:
{ name: '',
  age: 81,
  owns: { apples: 0, cats: [ { hairless: false, age: 0 } ] } }
*/
```
