# Ordering

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/Ordering

The current Effect source package is `4.0.0-rc.116`.

The current `packages/effect/src/Ordering.ts` source exposes **4 public entries**:

- `Ordering`
- `reverse`
- `match`
- `Reducer`

This is intentionally a small companion to `Order`.

`Order<A>` is a comparison function.

`Ordering` is the normalized result that comparison function returns.

The current implementation and tests were checked against:

```text
packages/effect/src/Ordering.ts
packages/effect/test/Ordering.test.ts
```

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `ordering.ts` — the three comparison values, reversal, matching, and
  first-nonzero reduction.
- `ordering.view.ts` — interactive visual demo.

## Intended location

```text
packages/features/src/labs/ordering/
├── ordering.ts
└── ordering.view.ts
```

No parent router/model/message/update files are modified.

## Core idea

The entire model is:

```ts
type Ordering =
    -1 |
    0 |
    1
```

The three values mean:

```text
-1
    first value is less than second

0
    both values compare as equal

1
    first value is greater than second
```

This normalized result is the common vocabulary shared by:

```text
Order comparators
sorting
tie-breaking
range logic
multi-criterion comparison
```

## Ordering versus Order

The distinction is simple but important.

### `Order<A>`

An `Order<A>` is a function:

```text
A × A
    ↓
Ordering
```

Example:

```ts
Order.Number(
    1,
    2
)
// -1
```

### `Ordering`

An `Ordering` is just that returned value:

```text
-1 | 0 | 1
```

The `Ordering` module therefore operates **after** a comparison exists.

For example:

```text
Order.flip
    reverses an Order function

Ordering.reverse
    reverses one computed Ordering value
```

That is why this demo stays focused on result-level behavior instead of
repeating the previous `Order` demo.

## 1. Values

### `Ordering`

A custom comparator can explicitly return the type:

```ts
const compareNumber = (
    self: number,
    that: number
): Ordering.Ordering =>
    self < that
        ? -1
        : self > that
          ? 1
          : 0
```

Then:

```text
compareNumber(1, 2)
    → -1

compareNumber(2, 2)
    → 0

compareNumber(3, 2)
    → 1
```

The union makes all legal comparison results visible to TypeScript.

A function returning an arbitrary `number` is less precise.

An `Ordering` promises:

```text
exactly less
exactly equal
or exactly greater
```

## Why normalize to three values?

JavaScript sort comparators technically accept any:

```text
negative number
zero
positive number
```

Effect's `Ordering` normalizes that broader convention to:

```text
-1
0
1
```

This gives downstream helpers a finite, exhaustive domain.

For example, `Ordering.match` does not need to interpret arbitrary numeric
magnitudes.

It only branches on the three semantic cases.

## 2. Reverse

### `reverse`

```ts
Ordering.reverse(
    -1
)
// 1
```

The complete mapping is:

```text
-1 → 1
 0 → 0
 1 → -1
```

Equality stays equality.

Only direction changes.

## Descending comparison

Suppose:

```ts
const compareNumber = (
    self: number,
    that: number
): Ordering.Ordering =>
    self < that
        ? -1
        : self > that
          ? 1
          : 0
```

Then descending comparison can be expressed as:

```ts
const compareDescending = (
    self: number,
    that: number
): Ordering.Ordering =>
    Ordering.reverse(
        compareNumber(
            self,
            that
        )
    )
```

For:

```text
1 vs 2
```

ascending returns:

```text
-1
```

while reversed returns:

```text
1
```

## `Ordering.reverse` versus `Order.flip`

Use:

```ts
Order.flip(
    order
)
```

when you have an entire comparator and want a reversed comparator.

Use:

```ts
Ordering.reverse(
    ordering
)
```

when the comparison has already been computed and only that one result needs to
be inverted.

Conceptually:

```text
Order.flip
    function-level operation

Ordering.reverse
    value-level operation
```

## 3. Match

### `match`

`Ordering.match` is exhaustive three-way pattern matching.

```ts
const label =
    Ordering.match({
        onLessThan:
            () =>
                "less than",
        onEqual:
            () =>
                "equal",
        onGreaterThan:
            () =>
                "greater than",
    })
```

Then:

```text
label(-1)
    → "less than"

label(0)
    → "equal"

label(1)
    → "greater than"
```

## Lazy branches

Each branch is a callback:

```text
LazyArg<A>
```

rather than a precomputed value.

Only the selected branch runs.

That matters when branch values are:

```text
expensive to compute
effectful outside Effect
logging something
allocating a result
```

although pure branch functions are normally the simplest use.

## Data-last form

```ts
const label =
    Ordering.match({
        onLessThan:
            () =>
                "L",
        onEqual:
            () =>
                "E",
        onGreaterThan:
            () =>
                "G",
    })

label(
    -1
)
// "L"
```

This is convenient when defining one reusable interpreter for Ordering values.

## Data-first form

The same helper also supports:

```ts
Ordering.match(
    1,
    {
        onLessThan:
            () =>
                "L",
        onEqual:
            () =>
                "E",
        onGreaterThan:
            () =>
                "G",
    }
)
// "G"
```

The current Effect test suite explicitly verifies both forms.

## Different branch result types

The generic result is:

```text
A | B | C
```

so branch callbacks do not need to return the same concrete type.

For example:

```text
onLessThan
    → string

onEqual
    → number

onGreaterThan
    → boolean
```

would produce:

```text
string | number | boolean
```

at the call site.

In application code, using one common result type is often easier to consume,
but the API does not force it.

## Why match instead of numeric branching?

This:

```ts
Ordering.match(
    ordering,
    {
        onLessThan:
            less,
        onEqual:
            equal,
        onGreaterThan:
            greater,
    }
)
```

makes the semantic cases explicit.

The alternative:

```text
if ordering < 0
else if ordering > 0
else
```

works, but it treats the value as a general number rather than the precise
three-case model.

`match` is especially useful when the result is being converted into:

```text
UI label
sorting indicator
debug explanation
state transition
```

## 4. Reducer

### `Reducer`

The module exports:

```ts
Ordering.Reducer
```

with type:

```text
Reducer<
    Ordering
>
```

Its combination rule is:

```text
first non-zero Ordering wins
```

and its identity is:

```text
0
```

This models lexicographic tie-breaking directly.

## `combine`

Examples:

```ts
Ordering.Reducer.combine(
    0,
    1
)
// 1
```

because the first comparison was equal, so the second comparison decides.

```ts
Ordering.Reducer.combine(
    -1,
    1
)
// -1
```

because the first comparison already decided the result.

The second value is irrelevant semantically once the first is non-zero.

The current tests verify combinations including:

```text
-1 + 1 → -1
 1 + -1 → 1
 0 + 1 → 1
 0 + -1 → -1
 0 + 0 → 0
```

## `combineAll`

```ts
Ordering.Reducer.combineAll([
    0,
    0,
    1,
    -1,
])
// 1
```

The first two criteria are ties.

The third criterion decides.

The final `-1` is not relevant.

## Short-circuiting

The current implementation returns as soon as `combineAll` sees a non-zero
Ordering.

Therefore:

```text
0
0
1
...
```

stops at:

```text
1
```

The remaining iterable is not consumed.

This can matter when the collection is:

```text
lazy
a generator
expensive to compute
stateful
```

## Identity

The reducer's:

```ts
initialValue
```

is:

```text
0
```

This makes sense because "equal so far" is the neutral state for prioritized
comparison.

Combining with zero does not override an already-decided result:

```text
1 combine 0
    → 1

-1 combine 0
    → -1
```

and a zero first value delegates to the next result.

## Multi-criterion comparison example

Suppose people are sorted by:

```text
age first
name second
```

A raw Ordering implementation can be:

```ts
const comparePerson = (
    self: Person,
    that: Person
): Ordering.Ordering =>
    Ordering.Reducer.combineAll([
        compareNumber(
            self.age,
            that.age
        ),
        compareString(
            self.name,
            that.name
        ),
    ])
```

### Different age

```text
Ada age 20
Zed age 30
```

The age Ordering is non-zero.

The name comparison is unnecessary.

### Same age

```text
Ada age 30
Grace age 30
```

Age returns:

```text
0
```

so name becomes the tie-breaker.

This is the same conceptual rule used by `Order.combine` and
`Order.combineAll`, just represented directly at the `Ordering` value level.

## Migration note

In earlier Effect APIs, Ordering exposed standalone combination helpers.

The current v4 migration annotations map those concepts to:

```text
Ordering.Reducer.combine
Ordering.Reducer.combineAll
```

The behavior remains:

```text
first non-zero wins
0 is identity
```

This is why the current module has only four exports even though it still
supports combining Ordering values.

## Relationship to Reducer

`Reducer<A>` provides:

```text
combine
initialValue
combineAll
```

For Ordering:

```text
combine
    first non-zero

initialValue
    0

combineAll
    first non-zero in iteration order
```

The custom `combineAll` implementation is optimized to short-circuit.

## Relationship to Order

The preceding `Order` module can be viewed as the higher-level API.

An Order contains reusable comparison policy:

```text
Order<Person>
Order<Date>
Order<Version>
```

and returns Ordering.

The Ordering module is useful when code needs to manipulate the result:

```text
reverse it
interpret it
combine several already-computed criteria
```

A compact mental model is:

```text
Order
    how should these values compare?

Ordering
    what was the comparison result?
```

## Relationship to sort

Native sorting typically consumes a comparator:

```text
(a, b) => negative | zero | positive
```

An Effect Order narrows that convention to an `Ordering`.

A raw function returning `Ordering.Ordering` can therefore also be passed to
native sorting APIs.

The demo's `compare_number` helper has exactly that shape.

## Ordering in Foldkit

Ordering is small enough that it works well as a pure helper inside Foldkit
update or view logic.

Examples include:

```text
compare sort indicators
interpret a current sort result
tie-break a prioritized sequence of comparisons
display "less / equal / greater" teaching output
```

It contains no Effect runtime dependency and no mutable state.

It should normally complement a domain `Order<A>` rather than replace it.

For reusable sorting policy, define an Order.

For one computed result, use Ordering.

## Current public surface

### Model

- `Ordering`

### Transform

- `reverse`

### Pattern matching

- `match`

### Combining

- `Reducer`

That is the complete current public surface.

## Type discipline

The generated demo has no explicit `any` annotations.

Every comparator, `match` branch, Foldkit Message payload, and UI callback that
could lose contextual typing has an explicit type where needed.

Button attributes are derived from `HtmlBuilder`.

The upstream Effect implementation itself is separate from this generated
artifact constraint.

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
resolved, so this check catches local syntax and implicit-any issues rather than
replacing a full typecheck inside the target monorepo.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/labs/*` demos:

1. add the child Model to the parent learn Model,
2. add `OrderingDemo.Message` to the parent Message union,
3. initialize `OrderingDemo.init`,
4. delegate child messages to `OrderingDemo.update`,
5. render `OrderingDemo.view(...)` from the Ordering route.

This artifact intentionally performs none of those edits.
