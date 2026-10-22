# Effect v4 Order visual demo

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/Order

The current Effect source package is `4.0.0-rc.116`.

The current `packages/effect/src/Order.ts` source exposes **25 public entries**:

- `Order`
- `OrderTypeLambda`
- `make`
- `String`
- `Number`
- `Boolean`
- `BigInt`
- `Date`
- `flip`
- `combine`
- `alwaysEqual`
- `combineAll`
- `mapInput`
- `Tuple`
- `Array`
- `Struct`
- `isLessThan`
- `isGreaterThan`
- `isLessThanOrEqualTo`
- `isGreaterThanOrEqualTo`
- `min`
- `max`
- `clamp`
- `isBetween`
- `makeReducer`

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `order.ts` — built-in comparisons, derived Person orders, composition,
  lexicographic collection orders, predicates, ranges, and reducer examples.
- `order.view.ts` — interactive visual demo.
- `order-preview.png` — static preview of the default Compare stage.

## Intended location

```text
packages/features/src/labs/order/
├── order.ts
└── order.view.ts
```

No parent router/model/message/update files are modified.

## Core idea

`Order<A>` is a total comparator:

```ts
interface Order<A> {
    (
        self: A,
        that: A
    ): -1 | 0 | 1
}
```

Its result means:

```text
-1
    self < that

0
    self and that are equal
    according to this Order

1
    self > that
```

This one abstraction can drive:

```text
sorting
comparison predicates
minimum / maximum
range checks
clamping
tuple / array ordering
multi-field object ordering
ordered data structures
```

The important design idea is that ordering is modeled as a reusable value
instead of being embedded into every call site.

## Ordering laws

A lawful total Order should satisfy:

```text
totality
antisymmetry
transitivity
```

Informally:

```text
any two values can be compared

reversing the values reverses
the non-zero ordering result

if a < b and b < c,
then a < c
```

Breaking these laws can produce inconsistent sorting and range behavior.

## 1. Compare

### `String`

```ts
Order.String(
    "apple",
    "banana"
)
// -1
```

The current implementation uses JavaScript's `<` comparison for lexicographic,
case-sensitive string ordering.

### `Number`

```ts
Order.Number(
    1,
    2
)
// -1
```

Numeric ordering has explicit `NaN` behavior.

The current source defines:

```text
NaN == NaN
NaN < every non-NaN number
```

under `Order.Number`.

It also treats:

```text
0
-0
```

as equal because `Order.make` first checks reference / primitive identity with
`===`.

### `Boolean`

```text
false < true
```

so:

```ts
Order.Boolean(
    false,
    true
)
// -1
```

### `BigInt`

```ts
Order.BigInt(
    2n,
    1n
)
// 1
```

uses ordinary bigint numeric ordering.

### `Date`

`Order.Date` is derived from:

```text
Date.getTime()
```

through `Order.Number`.

Earlier dates therefore compare before later dates.

Invalid Dates produce `NaN` from `getTime`, so they inherit the `Order.Number`
NaN behavior.

## `make`

```ts
const byLength =
    Order.make<
        string
    >(
        (
            self,
            that
        ) =>
            self.length <
                that.length
                ? -1
                : self.length >
                    that.length
                  ? 1
                  : 0
    )
```

constructs an Order directly.

The wrapper first checks:

```ts
self === that
```

and immediately returns `0` when true.

Otherwise it delegates to the supplied comparison function.

Use `make` when the ordering cannot be expressed more clearly by projecting an
existing Order.

## `flip`

```ts
const descending =
    Order.flip(
        Order.Number
    )
```

reverses an existing order.

Conceptually:

```text
ascending:
    1 < 2

flipped:
    1 > 2
```

The implementation swaps the comparator arguments.

## `alwaysEqual`

```ts
const neutral =
    Order.alwaysEqual<
        Person
    >()
```

returns `0` for every pair.

This is useful as the neutral / identity Order when combining a collection of
Orders.

It is also used by the Order reducer.

## `OrderTypeLambda`

`OrderTypeLambda` is the module's type-level higher-kinded representation.

It has no runtime behavior and is mainly useful for generic Effect type-class
code.

The visual demo lists it as part of the public surface but does not make it a
runtime interaction.

## 2. Derive

Most domain orders should be derived from a trusted carrier Order rather than
rewriting primitive comparison logic.

## `mapInput`

Given:

```ts
type Person =
    Readonly<{
        name: string
        age: number
        active: boolean
    }>
```

define:

```ts
const byName =
    Order.mapInput(
        Order.String,
        (
            person: Person
        ) =>
            person.name
    )
```

The result is:

```text
Order<Person>
```

with string ordering applied to each person's `name`.

Likewise:

```ts
const byAge =
    Order.mapInput(
        Order.Number,
        (
            person: Person
        ) =>
            person.age
    )
```

produces numeric age ordering.

### Why `mapInput` matters

Without it, every object comparator repeats:

```text
extract field
compare field
return ordering
```

With it, the primitive comparison policy remains centralized:

```text
Order.String
Order.Number
Order.Date
...
```

while the domain-specific code only says:

```text
which field matters?
```

## Pure projections

The mapping function runs for both compared values.

Keep it pure and deterministic.

If the projection changes between calls or has side effects, the derived Order
may stop satisfying ordering laws.

## Sorting

An `Order<A>` is directly compatible with JavaScript comparator positions
because it returns:

```text
-1 | 0 | 1
```

The demo sorts a copy:

```ts
[
    ...people
]
    .sort(
        byAge
    )
```

so the original array remains unchanged.

Effect's `Array.sort` also accepts Order values and performs immutable sorting.

## Descending derived order

Orders compose naturally:

```ts
const descendingAge =
    Order.flip(
        byAge
    )
```

There is no need to rewrite the `Person → age` projection.

## Date projection

A domain object containing:

```ts
createdAt: Date
```

can reuse:

```ts
Order.Date
```

through the same `mapInput` mechanism.

This keeps chronological semantics distinct from numeric or string comparison.

## 3. Compose

Multiple criteria use lexicographic tie-breaking.

That means:

```text
compare criterion 1
    ↓ if equal
compare criterion 2
    ↓ if equal
compare criterion 3
...
```

The first non-zero comparison wins.

## `combine`

```ts
const byAgeThenName =
    Order.combine(
        byAge,
        byName
    )
```

compares age first.

Only when ages are equal does it compare names.

This is useful when exactly two ordering criteria are needed.

## `combineAll`

```ts
const order =
    Order.combineAll([
        byAge,
        byName,
        byActive
    ])
```

extends the same rule to a finite iterable.

The source materializes the iterable into an array at construction time, so the
input collection should be finite.

## `alwaysEqual` as identity

An Order that always returns `0` contributes no ordering preference.

That makes:

```text
alwaysEqual
```

a natural neutral element for Order combination.

## `Struct`

```ts
const personOrder =
    Order.Struct({
        age:
            Order.Number,
        name:
            Order.String,
        active:
            Order.Boolean
    })
```

derives an object Order from field Orders.

### Field order matters

The current implementation obtains:

```ts
Object.keys(
    fields
)
```

and compares in that order.

Therefore:

```text
age
name
active
```

means:

```text
age has highest priority
name breaks age ties
active breaks remaining ties
```

Changing object field declaration order changes the comparison priority.

## `Tuple`

```ts
const pairOrder =
    Order.Tuple([
        Order.Number,
        Order.String
    ])
```

creates an Order for:

```text
readonly [
    number,
    string
]
```

It compares each tuple position with its corresponding Order and stops at the
first non-zero result.

Example:

```text
[1, "b"]
vs
[1, "a"]

first positions equal
second position "b" > "a"

result = 1
```

## `Array`

```ts
const arrayOrder =
    Order.Array(
        Order.Number
    )
```

provides lexicographic array comparison.

First, corresponding elements are compared.

Example:

```text
[1, 2]
vs
[1, 3]

1 == 1
2 < 3

result = -1
```

If all shared positions compare equal, length breaks the tie.

```text
[1, 2]
vs
[1, 2, 3]

shared prefix equal
2 elements < 3 elements

result = -1
```

This is the conventional lexicographic array rule.

## Struct versus combine

These approaches can express similar domain policies.

### Struct

Best when:

```text
field declaration itself
expresses the priority
```

### combine / combineAll

Best when:

```text
Orders already exist as reusable values
or criteria are assembled dynamically
```

The demo presents both so the distinction is visible.

## 4. Range

Once an Order exists, many comparison operations can be derived without
repeating comparator logic.

## `isLessThan`

```ts
const less =
    Order.isLessThan(
        Order.Number
    )

less(
    1,
    2
)
// true
```

This checks for exactly:

```text
Order result === -1
```

## `isGreaterThan`

Checks for:

```text
Order result === 1
```

## `isLessThanOrEqualTo`

Returns false only when comparison is:

```text
1
```

so equal values are included.

## `isGreaterThanOrEqualTo`

Returns false only when comparison is:

```text
-1
```

These helpers are themselves dual functions, supporting data-first and
data-last usage after supplying the Order.

## `min`

```ts
Order.min(
    Order.Number
)(
    5,
    2
)
// 2
```

returns the lower value under the supplied Order.

### Tie behavior

If the two values compare equal, the first argument is returned.

This matters for objects when equal-by-order values are different references.

## `max`

The symmetrical maximum selector.

It also returns the first argument on an ordering tie.

## `clamp`

```ts
const clamp =
    Order.clamp(
        Order.Number
    )({
        minimum:
            10,
        maximum:
            20
    })
```

Then:

```text
5  → 10
15 → 15
25 → 20
```

The range is inclusive.

The minimum should be less than or equal to the maximum under the same Order.

## `isBetween`

```ts
const between =
    Order.isBetween(
        Order.Number
    )({
        minimum:
            10,
        maximum:
            20
    })
```

returns true for both boundary values:

```text
10 → true
20 → true
```

and for every value between them.

It returns false outside the interval.

## Domain range logic

The important benefit is that these helpers do not assume numbers.

If you have:

```text
Order<Date>
Order<Version>
Order<Priority>
```

the same:

```text
min
max
clamp
isBetween
```

helpers reuse those domain semantics.

## `makeReducer`

```ts
const reducer =
    Order.makeReducer<
        Person
    >()
```

returns a:

```text
Reducer<
    Order<Person>
>
```

Its logic is:

```text
combine
    = Order.combine

initialValue
    = always-equal Order

combineAll
    = Order.combineAll
```

That makes Order composition usable in generic reduction workflows.

## Reducer identity

Reducing zero Orders gives an Order that treats all compared values as equal.

Reducing one Order yields effectively that Order.

Reducing several applies them in sequence as tie-breakers.

## Order and sorting

The Effect documentation uses Order values with both:

```text
Effect Array.sort
native Array.prototype.sort
```

The semantic distinction is mutation:

```text
Effect Array.sort
    returns a sorted collection
    without mutating the input

native array.sort
    mutates that array
```

In the demo, native sort is only called on a copied array:

```ts
[
    ...people
].sort(
    order
)
```

so the example remains observationally immutable.

## Number corner cases

`Order.Number` has intentionally specified behavior beyond ordinary `<`.

### `NaN`

```text
NaN vs NaN
    → 0

NaN vs finite number
    → -1

finite number vs NaN
    → 1
```

This gives numbers a total ordering even though normal JavaScript numeric
comparison involving NaN does not.

### `0` and `-0`

The `Order.make` equality shortcut uses:

```ts
self === that
```

so:

```text
0
-0
```

compare equal.

## Order versus Equivalence

An Order can say:

```text
two values occupy the same ordering position
```

by returning `0`.

That does not always mean the values are the same object or domain identity.

Use an `Equivalence` when the question is explicitly equality.

Use an `Order` when the program needs:

```text
less / equal-position / greater
```

semantics.

For many primitive orders the equality notions align, but they are separate
abstractions.

## Order with Newtype

The preceding Newtype module can lift a carrier Order:

```ts
Newtype.makeOrder<
    UserId
>(
    Order.Number
)
```

This preserves number ordering while keeping the comparator typed specifically
for `UserId`.

That is a useful pattern when multiple domain values share one carrier but
should not be compared accidentally with one another.

## Order in a Foldkit feature

Order values work well as static domain utilities near a feature Model.

For example:

```text
Order<Person>
Order<Task>
Order<SearchResult>
```

can be defined once and reused when update logic changes:

```text
sort field
sort direction
group priority
range selection
```

Because an Order is just a pure comparator value, using it inside Foldkit update
logic does not introduce side effects or mutable state.

## Current public surface

### Models / type-level

- `Order`
- `OrderTypeLambda`

### Constructors / instances

- `make`
- `String`
- `Number`
- `Boolean`
- `BigInt`
- `Date`
- `alwaysEqual`

### Derivation / composition

- `flip`
- `combine`
- `combineAll`
- `mapInput`
- `Tuple`
- `Array`
- `Struct`
- `makeReducer`

### Comparison helpers

- `isLessThan`
- `isGreaterThan`
- `isLessThanOrEqualTo`
- `isGreaterThanOrEqualTo`
- `min`
- `max`
- `clamp`
- `isBetween`

That accounts for all 25 public entries in the current source.

## Type discipline

The generated demo has no explicit `any` annotations.

Every domain projection, sorting mapper, Foldkit Message payload, and UI callback
that could lose contextual typing has an explicit type.

Button attributes are derived from `HtmlBuilder`.

The upstream Effect source itself uses generic `any` types in some Tuple /
Struct type-level signatures; that is separate from the generated artifact
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
resolved, so this check catches local syntax and implicit-any issues rather than
replacing a full typecheck inside the target monorepo.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/labs/*` demos:

1. add the child Model to the parent learn Model,
2. add `OrderDemo.Message` to the parent Message union,
3. initialize `OrderDemo.init`,
4. delegate child messages to `OrderDemo.update`,
5. render `OrderDemo.view(...)` from the Order route.

This artifact intentionally performs none of those edits.
