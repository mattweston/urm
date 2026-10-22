# RegExp

Standalone FoldKit teaching demo for:

https://effect.website/docs/v4/api/effect/RegExp

The live Effect v4 API reference currently displays `4.0.0-rc.115` and exposes
three names: `RegExp`, `isRegExp`, and `escape`. The URM workspace pins Effect
`4.0.0-rc.112`, while the vendored `.context/effect` snapshot identifies itself
as `4.0.0-rc.108`. The public `RegExp` source used here has the same three-export
surface as the live page.

## Files

- `regexp.ts` — real Effect examples, Schema model, messages, update, and visual
  teaching snapshots.
- `regexp.view.ts` — interactive FoldKit view.
- `regexp-preview.png` — static preview of the initial Construct / Alias state.

## Intended location

```text
packages/features/src/labs/_regexp/
├── README.md
├── regexp.ts
└── regexp.view.ts
```

The existing `_regexp` git scaffold is intentionally left untouched. No parent
router, model, message, update, export map, or repository file is changed by
this artifact.

## What the module is for

Effect's `RegExp` module is a small bridge to JavaScript regular expressions.
It gives you:

```text
RegExp.RegExp
    the native globalThis.RegExp constructor

RegExp.isRegExp
    a guard for unknown values

RegExp.escape
    an escaping helper for literal pattern fragments
```

It does **not** wrap regular expressions in an Effect-specific runtime type.
Constructed values are normal JavaScript `RegExp` instances.

## Public surface

The current module has three exports:

- `RegExp` — the native constructor alias.
- `isRegExp` — the type guard.
- `escape` — escapes regular-expression syntax characters in a string.

## 1. Construct

### Native constructor alias

```ts
import { RegExp } from "effect"

const pattern = new RegExp.RegExp(
    "hello",
    "i"
)
```

The vendored source is literally:

```ts
export const RegExp = globalThis.RegExp
```

So:

```ts
RegExp.RegExp === globalThis.RegExp
// true
```

That means the resulting object has ordinary JavaScript behavior:

```text
source
flags
lastIndex
test
exec
Symbol.match
...
```

### Flags remain native behavior

The Effect module does not add its own flag parser.

```ts
new RegExp.RegExp("hello", "iu")
// valid

new RegExp.RegExp("hello", "not-a-flag")
// throws SyntaxError
```

If flags are dynamic input, validate or whitelist them separately from pattern
text.

## 2. Narrow

### `isRegExp`

```ts
const describe = (
    input: unknown
): string =>
    RegExp.isRegExp(input)
        ? input.source
        : "not a regexp"
```

Examples:

```ts
RegExp.isRegExp(/abc/)
// true

RegExp.isRegExp("abc")
// false
```

The current vendored implementation delegates to `Predicate.isRegExp`, which is
implemented as:

```ts
input instanceof RegExp
```

That is useful for normal application boundaries, while retaining the usual
JavaScript `instanceof` cross-realm caveat.

`isRegExp` does not:

```text
parse a string
compile pattern source
validate a pattern string
clone an existing RegExp
```

It only answers whether the current value is already a native `RegExp`.

## 3. Escape

### Dynamic text is data, not syntax

Suppose a literal search term comes from a user or data source:

```text
price: $5.00 + tax?
```

If that text is interpolated directly into regular-expression source, `$`, `.`,
`+`, and `?` acquire regex meanings.

Use:

```ts
const escaped = RegExp.escape(
    "price: $5.00 + tax?"
)
```

The helper escapes the module's regex metacharacter set:

```text
/
\\
^
$
*
+
?
.
(
)
|
[
]
{
}
```

Ordinary characters are preserved.

### `escape` is specifically for pattern source

It does not:

```text
pick flags
add ^ / $ anchors
parse replacement strings
decide grouping or alternation structure
compile the RegExp
```

Those are separate decisions.

## 4. Compose

A useful boundary is:

```text
trusted regex structure
    +
escaped dynamic literal fragment
```

For an exact literal match:

```ts
const literalPattern = (
    text: string
): RegExp =>
    new RegExp.RegExp(
        `^${RegExp.escape(text)}$`,
        "u"
    )
```

Then:

```ts
literalPattern("a*b").test("a*b")
// true

literalPattern("a*b").test("a*b!")
// false
```

Here:

```text
^ and $
    trusted operators supplied by application code

a*b
    data transformed by escape before interpolation
```

### Escaping is not a complete regex policy

Escaping the dynamic fragment stops that fragment from becoming regex syntax.
It does not make every possible surrounding pattern automatically efficient or
safe.

The application still owns:

```text
the trusted static pattern shell
flags
anchoring
grouping
quantifiers outside the escaped fragment
lifetime / reuse of stateful regex instances
```

### Global and sticky expressions carry state

This is ordinary native behavior and therefore also applies to
`RegExp.RegExp`:

```ts
const pattern = new RegExp.RegExp("a", "g")

pattern.test("a a")
// true; lastIndex becomes 1

pattern.test("a a")
// true; lastIndex becomes 3

pattern.test("a a")
// false; lastIndex resets to 0
```

Do not assume repeated calls to a reused `g` or `y` instance are independent.

## Foldkit integration

This lesson keeps RegExp objects out of the Foldkit `Model`.

The model stores only serializable teaching state:

```text
stage
constructCase
narrowCase
escapeCase
composeCase
```

The actual regex examples are module-level values and pure helper functions.
That preserves the normal Foldkit split:

```text
Model / Message / update
    serializable UI state

RegExp construction / matching helpers
    implementation details used to explain behavior
```

If a production feature needs to preserve a pattern configuration in the model,
prefer serializable inputs such as:

```text
source: string
flags: string
```

and construct the native RegExp at the boundary where it is used.

## Type discipline

The generated demo has no explicit `any` annotations.

Every Foldkit Message payload and callback that could lose contextual typing is
explicitly typed where appropriate. Button attributes are derived from
`HtmlBuilder`.

## Validation note

The standalone validation command is:

```text
tsc --noEmit --noResolve --allowImportingTsExtensions
    --target ES2022
    --module ESNext
    --moduleResolution bundler
    --skipLibCheck
    --noImplicitAny
```

In this environment the workspace packages are intentionally unresolved, so the
check is used to catch local syntax and implicit-any problems rather than
replace a full monorepo typecheck.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/labs/*` demos:

1. add the child Model to the parent learn Model,
2. add `RegExpDemo.Message` to the parent Message union,
3. initialize `RegExpDemo.init`,
4. delegate child messages to `RegExpDemo.update`,
5. render `RegExpDemo.view(...)` from the RegExp route.

This artifact intentionally performs none of those edits.
