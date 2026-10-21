# Effect 4 Schema — Foldkit visual demo

## Mental model

A Schema is more than runtime validation.

For a simple schema:

```ts
Schema.Schema<T>
```

you can think about the decoded TypeScript value `T`.

Most concrete Effect schemas are also codecs and track a second
representation:

```text
Encoded  ⇄  Type
```

For example:

```ts
Schema.FiniteFromString
```

has:

```text
Encoded = string
Type    = number
```

So decoding can both **validate** and **transform** incoming data, and encoding
can turn domain values back into their wire representation.

## Demo schema

The Foldkit example uses one concrete user payload throughout:

```ts
const Role = Schema.Literals([
  "admin",
  "member"
])

const UserWire = Schema.Struct({
  id: Schema.String,
  name: Schema.Trim,
  age: Schema.FiniteFromString,
  role: Role,
  email: Schema.optionalKey(Schema.String)
})
```

The decoded type is conceptually:

```ts
type User = {
  readonly id: string
  readonly name: string
  readonly age: number
  readonly role: "admin" | "member"
  readonly email?: string
}
```

while the encoded representation has:

```ts
age: string
```

## The four sections

### 1. Shape

Shows:

- `Schema.Struct`
- `Schema.String`
- `Schema.Literals`
- `Schema.optionalKey`
- transformed fields such as `Schema.Trim`
- encoded type vs decoded TypeScript type

Type extraction:

```ts
type User = typeof UserWire.Type
```

Encoded type extraction:

```ts
type UserEncoded =
  Schema.Codec.Encoded<typeof UserWire>
```

### 2. Decode

Decode data from an untrusted boundary:

```ts
Schema.decodeUnknownResult(UserWire)(input)
```

The result is either:

```text
Success<User>
```

or:

```text
Failure<SchemaError>
```

The interactive examples include:

- valid input
- invalid number string
- invalid role literal
- missing required name

Effect 4 provides several decoder adapters depending on the boundary you want,
including Result, Option, Exit, Effect, Promise, and throwing/synchronous forms.

### 3. Transform

The demo compares:

```ts
Schema.NumberFromString
```

with:

```ts
Schema.FiniteFromString
```

`NumberFromString` follows JavaScript number coercion and can therefore decode
strings to non-finite values such as `NaN` and `Infinity`.

`FiniteFromString` adds the finite-number validation.

Both have:

```text
Encoded = string
Type    = number
```

The user schema also uses:

```ts
Schema.Trim
```

so:

```text
"  Ada Lovelace  "
```

decodes to:

```text
"Ada Lovelace"
```

### 4. Encode

The same codec runs in the opposite direction:

```ts
Schema.encodeResult(UserWire)(user)
```

For the demo:

```ts
{
  age: 36
}
```

encodes as:

```ts
{
  age: "36"
}
```

The optional `email` key is also demonstrated both present and absent.

## Additional real source example

`examples/schema.ts` includes a union:

```ts
const Event = Schema.Union([
  Schema.Struct({
    type: Schema.Literal("UserCreated"),
    user: UserWire
  }),
  Schema.Struct({
    type: Schema.Literal("UserDeleted"),
    id: Schema.String
  })
])
```

This demonstrates composition of Struct, Literal, Union, and the same nested
codec.

## Real Effect 4 APIs used

- `Schema.Struct`
- `Schema.String`
- `Schema.Literal`
- `Schema.Literals`
- `Schema.Union`
- `Schema.optionalKey`
- `Schema.Trim`
- `Schema.NumberFromString`
- `Schema.FiniteFromString`
- `Schema.decodeUnknownResult`
- `Schema.decodeResult`
- `Schema.encodeResult`
- `Schema.Codec.Encoded`
- `Result`
