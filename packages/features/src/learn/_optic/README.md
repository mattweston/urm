# Optic

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/Optic

The current Effect source package is `4.0.0-rc.116`.

The current `packages/effect/src/Optic.ts` source exposes **24 top-level public
exports**:

- `Iso`
- `makeIso`
- `Lens`
- `makeLens`
- `Prism`
- `makePrism`
- `fromChecks`
- `Optional`
- `makeOptional`
- `Traversal`
- `get`
- `getResult`
- `set`
- `replace`
- `replaceResult`
- `modify`
- `getAll`
- `modifyAll`
- `id`
- `entries`
- `some`
- `none`
- `success`
- `failure`

The optic instances themselves also expose the fluent focusing API:

```text
compose
modify
key
optionalKey
check
refine
tag
at
pick
omit
notUndefined
forEach
modifyAll
```

depending on the optic kind.

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `optic.ts` — real Iso/Lens/Prism/Optional examples, immutable nested focus,
  structured failure, Option / Result built-ins, and Traversal examples.
- `optic.view.ts` — interactive visual demo.
- `optic-preview.png` — static preview of the default Kinds stage.

## Intended location

```text
packages/features/src/learn/optic/
├── optic.ts
└── optic.view.ts
```

No parent router/model/message/update files are modified.

## Core idea

An Optic describes a **focus** inside a larger immutable value.

The focus can have different guarantees.

```text
Iso
    always reads
    can build source from focus
    reversible

Lens
    always reads one focus
    replacement needs original source

Prism
    read may fail
    can build source from focus

Optional
    read may fail
    replacement may fail

Traversal
    zero or more focused values
```

This is more than "nested property access".

The optic kind captures what the program knows about:

```text
whether reading can fail
whether writing can fail
whether the original source is needed
whether there is one focus or many
```

## 1. Kinds

### `Iso<S, A>`

An Iso represents a lossless reversible conversion.

```ts
const text =
    Optic.makeIso<
        number,
        string
    >(
        String,
        Number
    )
```

The two directions are:

```text
get:
    S → A

set:
    A → S
```

The source documentation states the usual round-trip laws:

```text
get(set(a)) = a
set(get(s)) = s
```

for a lawful Iso.

An Iso is the strongest optic in this module and extends both Lens and Prism.

### `Lens<S, A>`

A Lens always finds exactly one focus.

```ts
type Person =
    Readonly<{
        name: string
        age: number
    }>

const name =
    Optic.id<
        Person
    >()
        .key(
            "name"
        )
```

Reading is total:

```ts
name.get({
    name: "Ada",
    age: 36
})
// "Ada"
```

Replacing requires the existing source:

```text
new focus + original source
    → new source
```

### `Prism<S, A>`

A Prism represents conditional focus.

Reading can fail:

```text
S
    → Result<A, Issue>
```

but constructing the source from a focus is source-free:

```text
A
    → S
```

Typical examples include:

```text
tagged union variant
Option.Some
Result.Success
validated subset
```

### `Optional<S, A>`

Optional is the general single-focus optic.

Both reading and replacement can fail:

```text
getResult:
    S → Result<A, Issue>

replaceResult:
    A × S → Result<S, Issue>
```

The non-Result convenience operations deliberately fail softly:

```text
replace failure
    → original source

modify failure
    → original source
```

### `Traversal<S, A>`

Traversal is the multi-focus form.

Its model extends:

```text
Optional<
    S,
    ReadonlyArray<A>
>
```

and represents:

```text
zero or more A values inside S
```

The main APIs are:

```text
forEach
getAll
modifyAll
```

## Constructor family

The module provides low-level constructors for every single-focus kind:

```text
makeIso
makeLens
makePrism
makeOptional
```

and:

```text
fromChecks
```

for a Prism backed by Schema checks.

This is useful when the built-in fluent path operations are not enough.

## Composition rules

Composition preserves the strongest guarantees available from both sides.

The current tests cover the complete composition matrix.

A useful summary is:

```text
Iso + X
    = X

Lens + Lens
    = Lens

Prism + Prism
    = Prism

Lens + Prism
    = Optional

Prism + Lens
    = Optional

anything + Optional
    = Optional
```

This explains why drilling through guaranteed fields stays a Lens, while adding
a conditional union / Option focus weakens the chain.

## 2. Focus

### `id`

```ts
Optic.id<S>()
```

starts a chain as an identity Iso:

```text
S ↔ S
```

It is the common entry point for fluent optics.

## `key`

```ts
Optic.id<
    State
>()
    .key(
        "profile"
    )
    .key(
        "name"
    )
```

focuses required fields / tuple positions.

When the current optic is a Lens, `key` remains a Lens.

The update is immutable.

For:

```text
{
    profile: {
        name: "Ada",
        score: 7
    }
}
```

replacing `name` creates a new structure along the focused path while leaving
the input value untouched.

The current implementation combines adjacent key paths internally to make this
kind of nesting efficient.

### Union restriction

`key` is intentionally rejected on a union focus.

For a tagged union:

```text
Circle | Rect
```

narrow first:

```ts
Optic.id<
    Shape
>()
    .tag(
        "Circle"
    )
    .key(
        "radius"
    )
```

This makes the branch assumption explicit.

## `optionalKey`

`optionalKey` is different from `key`.

The focus type becomes:

```text
A[Key] | undefined
```

and setting:

```text
undefined
```

removes the key.

For an optional object field:

```ts
const nickname =
    Optic.id<
        Profile
    >()
        .optionalKey(
            "nickname"
        )

nickname.replace(
    undefined,
    {
        name: "Ada",
        nickname: "ace"
    }
)
```

produces an object without `nickname`.

For arrays / tuples, setting an optional indexed focus to undefined splices that
element.

## `at`

`at` means:

> Focus this key only when it already exists.

It yields an Optional.

For:

```ts
type Env =
    Readonly<
        Record<
            string,
            number
        >
    >
```

then:

```ts
Optic.id<
    Env
>()
    .at(
        "PORT"
    )
```

succeeds when `PORT` is an own property.

A missing key produces a structured:

```text
SchemaIssue.Pointer
    └─ SchemaIssue.MissingKey
```

for both read and explicit replacement.

This differs from `key`, which assumes the key is part of the total structure.

## `check`

`check` adds one or more Schema checks to a chain.

For example:

```ts
Optic.id<
    number
>()
    .check(
        Schema.isGreaterThan(
            0
        )
    )
```

becomes a conditional optic that focuses only positive numbers.

Success:

```text
5 → Success(5)
```

Failure:

```text
-1 → Failure(Issue)
```

The current tests verify that successive `check` calls accumulate checks.

## `fromChecks`

The standalone constructor:

```ts
Optic.fromChecks(
    checkA,
    checkB
)
```

creates a Prism directly from one or more Schema checks.

The setter is identity: validation controls focus, not runtime wrapping.

## `refine`

`refine` performs narrowing with a TypeScript type guard.

It can optionally receive Schema filter annotations for clearer error details.

Use it for custom subtype logic when `_tag` is not the right discriminator.

## `tag`

`tag` is the tagged-union convenience focus.

```ts
const circle =
    Optic.id<
        Shape
    >()
        .tag(
            "Circle"
        )
```

focuses only the matching `_tag` variant.

From there:

```ts
circle.key(
    "radius"
)
```

is type-safe because the union has already been narrowed.

## `notUndefined`

```ts
Optic.id<
    number |
    undefined
>()
    .notUndefined()
```

turns `undefined` into a failed conditional focus.

It is the optic equivalent of narrowing out `undefined`.

## `pick` / `omit`

For struct-focused Lens / Optional values:

```text
pick(keys)
    focus only those keys

omit(keys)
    focus every key except those keys
```

The current tests also cover replacement behavior for optional properties that
are absent from the replacement object.

## 3. Failure-aware operations

Effect v4 exposes standalone dual operations in addition to optic instance
methods.

The current standalone surface is:

```text
get
getResult
set
replace
replaceResult
modify
getAll
modifyAll
```

These support both data-first and data-last forms.

## `get`

For Lens values:

```ts
Optic.get(
    source,
    lens
)
```

returns the focus directly.

Pipe-friendly form:

```ts
Optic.get(
    lens
)(
    source
)
```

## `getResult`

For Optional / conditional focus:

```ts
Optic.getResult(
    source,
    optic
)
```

returns:

```text
Result<
    A,
    SchemaIssue.Issue
>
```

This preserves the structured failure rather than converting it to `undefined`
or throwing.

## `set`

`set` belongs to Prism-style construction:

```ts
Optic.set(
    focusedValue,
    prism
)
```

constructs the source without needing an old source.

For example:

```ts
Optic.set(
    12,
    Optic.some<
        number
    >()
)
```

returns:

```text
Option.some(12)
```

## `replace`

```ts
Optic.replace(
    source,
    optic,
    newFocus
)
```

updates an existing source.

If an Optional cannot focus, `replace` returns the exact original source value.

This gives a convenient total function:

```text
S → S
```

when explicit failure handling is not needed.

## `replaceResult`

Use:

```ts
Optic.replaceResult(
    source,
    optic,
    newFocus
)
```

when a failed replacement must stay observable.

The result is:

```text
Result<
    S,
    SchemaIssue.Issue
>
```

## `modify`

```ts
Optic.modify(
    source,
    optic,
    transform
)
```

transforms one focus.

When the optic cannot focus, the original source is returned.

This means callers can write compositional immutable transformations without an
exception path.

## Built-in Option optics

### `some`

```ts
Optic.some<A>()
```

is a Prism:

```text
Option<A> ↔ conditional A
```

Reading None fails.

Setting `A` constructs `Some(A)`.

### `none`

```ts
Optic.none<A>()
```

focuses Option.None and exposes:

```text
undefined
```

Setting undefined constructs `Option.none()`.

## Built-in Result optics

### `success`

```ts
Optic.success<
    A,
    E
>()
```

focuses only the success value.

### `failure`

```ts
Optic.failure<
    A,
    E
>()
```

focuses only the failure value.

These make Option / Result branching composable with the rest of an optic chain.

## Structured issues

Conditional focus uses:

```text
SchemaIssue.Issue
```

for failure.

The module does not format these issues automatically.

This is deliberate: callers can preserve structured failure until the UI,
logging, or validation boundary chooses how to render it.

## 4. Traversal

### `forEach`

For an array-like focus:

```ts
const positive =
    Optic.id<
        State
    >()
        .key(
            "values"
        )
        .forEach(
            (
                item
            ) =>
                item.check(
                    Schema.isGreaterThan(
                        0
                    )
                )
        )
```

produces a Traversal over only positive elements.

For:

```text
[3, -1, 5, 0]
```

the focused values are:

```text
[3, 5]
```

## `getAll`

```ts
Optic.getAll(
    source,
    traversal
)
```

returns a fresh mutable array containing all current focused values.

If the traversal itself cannot focus the source, `getAll` returns:

```text
[]
```

rather than an error Result.

That behavior is covered by the current tests.

## `modifyAll`

```ts
Optic.modifyAll(
    source,
    traversal,
    transform
)
```

maps the transformation over every matched value.

For:

```text
[3, -1, 5, 0]
```

and:

```text
value * 10
```

the positive-only traversal produces:

```text
[30, -1, 50, 0]
```

Non-matching elements stay unchanged.

## `modify` versus `modifyAll`

A Traversal is technically:

```text
Optional<
    S,
    ReadonlyArray<A>
>
```

so its inherited:

```text
modify
```

operates on the whole focused array.

By contrast:

```text
modifyAll
```

applies the function to each individual focused element.

This is an important distinction.

## Traversal replacement arity

Replacing through a Traversal has an exact arity requirement.

If two values are currently focusable, replacing with an array of one value
fails.

The current test suite checks the message:

```text
each: replacement length mismatch
```

The reason is that each replacement value must correspond to one focusable
source element.

## `entries`

```ts
Optic.entries<A>()
```

is an Iso:

```text
Record<string, A>
↔
ReadonlyArray<
    readonly [
        string,
        A
    ]
>
```

The getter uses:

```text
Object.entries
```

and the setter uses:

```text
Object.fromEntries
```

This makes Record values traversable as array entries.

For example:

```ts
const positiveValues =
    Optic.entries<
        number
    >()
        .forEach(
            (
                entry
            ) =>
                entry
                    .key(
                        1
                    )
                    .check(
                        Schema.isGreaterThan(
                            0
                        )
                    )
        )
```

can focus only positive record values while preserving their keys.

## Pure immutable replacement

Optic update operations do not mutate their input.

The current implementation clones only objects / arrays along the focused path
for Lens-like structural updates.

That makes optics a good fit for Foldkit's immutable Model / Update style:

```text
Model
    ↓ optic modify / replace
new Model
```

without introducing mutable nested updates.

## Optic in Foldkit

Optic can simplify deeply nested Model changes while keeping Foldkit's explicit
Message / Update architecture.

Instead of manually spreading several nested records:

```text
model
→ copy profile
→ copy preferences
→ replace one field
```

a Lens can express the path once and the update can remain pure.

A useful approach is:

```text
feature module
    define reusable optics near the Model

update
    apply Optic.modify / replace

view
    receive the resulting immutable Model
```

Optic is not a replacement for Message or Update. It is a precise immutable
transformation tool inside them.

## Optic and Newtype

The preceding Newtype module uses:

```ts
Newtype.makeIso
```

to expose wrapping / unwrapping as an Optic Iso.

That is an example of why Iso is useful beyond nested object access:

```text
representation conversion
    can itself be composed with structural focus
```

A Newtype Iso can therefore compose with other optics without adding a runtime
wrapper.

## Current public top-level surface

### Models

- `Iso`
- `Lens`
- `Prism`
- `Optional`
- `Traversal`

### Constructors

- `makeIso`
- `makeLens`
- `makePrism`
- `makeOptional`
- `fromChecks`

### Standalone operations

- `get`
- `getResult`
- `set`
- `replace`
- `replaceResult`
- `modify`
- `getAll`
- `modifyAll`

### Built-in optics

- `id`
- `entries`
- `some`
- `none`
- `success`
- `failure`

That accounts for all 24 top-level exports in the current source.

## Type discipline

The generated demo has no explicit `any` annotations.

Every callback whose contextual type could be lost in the standalone validation
environment is explicitly typed, including Traversal element Iso callbacks,
transform functions, Foldkit Message payloads, and UI callbacks.

Button attributes are derived from `HtmlBuilder`.

The upstream Effect Optic implementation currently uses internal generic `any`
types in its compiler machinery; that is separate from the generated artifact
constraint.

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

In this environment the actual `effect`, `foldkit`, and UI packages are not
resolved, so this check catches local syntax and implicit-any problems rather
than replacing a full typecheck inside the target monorepo.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/learn/*` demos:

1. add the child Model to the parent learn Model,
2. add `OpticDemo.Message` to the parent Message union,
3. initialize `OpticDemo.init`,
4. delegate child messages to `OpticDemo.update`,
5. render `OpticDemo.view(...)` from the Optic route.

This artifact intentionally performs none of those edits.
