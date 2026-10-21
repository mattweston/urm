# Effect 4 String — Foldkit visual demo

## Mental model

Effect's `String` module works on ordinary JavaScript strings, but provides a
consistent functional API designed to compose well with `pipe`.

Some helpers also improve safety compared with raw JavaScript sentinel values:

```ts
String.at("abc", 10)
// Option.none()

String.indexOf("z")("abc")
// Option.none()
```

instead of `undefined` / `-1`.

## The four sections

### 1. Normalize

A pipe-friendly normalization chain:

```ts
pipe(
  "  hELLo WoRLD  ",
  String.trim,
  String.toLowerCase,
  String.capitalize
)
// "Hello world"
```

Several simple transformations preserve string-literal information at the type
level too:

```ts
type A = String.Trim<"  hello  ">
// "hello"
```

and `toUpperCase`, `toLowerCase`, `capitalize`, and `uncapitalize` use the
corresponding TypeScript string literal types.

### 2. Inspect

Predicates:

```ts
pipe(text, String.includes("effect"))
pipe(text, String.startsWith("hello"))
pipe(text, String.endsWith("world"))
```

Safe positions:

```ts
String.at(text, 6)
// Option<string>

pipe(text, String.indexOf("effect"))
// Option<number>
```

Other safe indexed helpers in the module include:

- `String.charAt`
- `String.charCodeAt`
- `String.codePointAt`

### 3. Segment

Split:

```ts
pipe(
  "effect-string-helpers",
  String.split("-")
)
// ["effect", "string", "helpers"]
```

Slice:

```ts
pipe(
  "effect-string-helpers",
  String.slice(7, 13)
)
// "string"
```

Take from either side:

```ts
String.takeLeft("Hello World", 5)
// "Hello"

String.takeRight("Hello World", 5)
// "World"
```

### 4. Naming & multiline text

Effect 4 includes general identifier normalization:

```ts
String.camelCase("HTTP response_code")
String.pascalCase("HTTP response_code")
String.snakeCase("HTTP responseCode")
String.kebabCase("HTTP responseCode")
String.constantCase("http responseCode")
String.configCase("api-v2 xml")
```

These accept mixed input formats rather than requiring the input to already be
a specific case.

The demo also shows `stripMargin`:

```ts
String.stripMargin(
  "  |hello\n  |from\n  |Effect"
)
// "hello\nfrom\nEffect"
```

For line iteration, the module provides:

```ts
String.linesIterator(text)
String.linesWithSeparators(text)
```

## Real Effect 4 APIs used

The source includes:

- `String.trim`
- `String.trimStart`
- `String.trimEnd`
- `String.toUpperCase`
- `String.toLowerCase`
- `String.capitalize`
- `String.split`
- `String.includes`
- `String.startsWith`
- `String.endsWith`
- `String.at`
- `String.indexOf`
- `String.slice`
- `String.takeLeft`
- `String.takeRight`
- `String.camelCase`
- `String.pascalCase`
- `String.snakeCase`
- `String.kebabCase`
- `String.constantCase`
- `String.configCase`
- `String.stripMargin`
- `String.linesIterator`
- `Option`
- `pipe`
