# Reducer

Standalone FoldKit teaching demo for:

https://effect.website/docs/v4/api/effect/Reducer

The current Effect v4 API reference displays `4.0.0-rc.116`. The URM workspace
pins Effect `4.0.0-rc.112`, while the vendored `.context/effect` snapshot
identifies itself as `4.0.0-rc.108`. The `Reducer` source used by this lesson is
present in the vendored snapshot and its public API matches the current v4 page:
`Reducer`, `make`, and `flip`.

## Files

- `reducer.ts` — real Effect examples, Schema model, messages, update, and
  visual teaching snapshots.
- `reducer.view.ts` — interactive FoldKit view.
- `reducer-preview.png` — static preview of the initial Build / Identity state.

## Intended location

```text
packages/features/src/labs/_reducer/
├── README.md
├── reducer.ts
└── reducer.view.ts
```

The existing `_reducer` git scaffold is intentionally left untouched. No parent
router, model, message, update, export map, or repository file is changed by
this artifact.

## What Reducer is for

A `Reducer<A>` is a reusable strategy for combining many `A` values into one
`A`.

It extends `Combiner.Combiner<A>` with two pieces:

```text
initialValue
    the neutral starting value

combineAll(iterable)
    reduce an entire Iterable<A> into one A
```

That makes a reducer useful when the same reduction rule should be passed around
rather than rewritten at each `Array.reduce` call site.

## Public surface

The current module has three exports:

- `Reducer<A>` — the model/interface.
- `make` — construct a reducer.
- `flip` — reverse the argument order of `combine`.

The lesson also uses reducers exported by other Effect modules, including:

```text
Number.ReducerSum
Number.ReducerMultiply
String.ReducerConcat
```

## 1. Build

### `Reducer.make`

```ts
import { Reducer } from "effect"

const Sum = Reducer.make<number>(
    (self, that) => self + that,
    0
)
```

`Sum` contains:

```text
combine(self, that)
initialValue
combineAll(collection)
```

The first two arguments define the normal reducer semantics. `combineAll` is
created automatically unless a third argument is supplied.

### The initial value is the empty result

```ts
Sum.combineAll([])
// 0
```

For a lawful reducer, `initialValue` is the neutral element for `combine`:

```text
sum         → 0
product     → 1
string concat → ""
boolean AND → true
boolean OR  → false
```

Picking an arbitrary seed can make the reducer surprising because the same seed
is also the result for an empty iterable.

## 2. Fold

### Default `combineAll`

If the third `make` argument is omitted, Effect performs a left-to-right fold:

```ts
let out = initialValue

for (const value of collection) {
    out = combine(out, value)
}

return out
```

For example:

```ts
const Concat = Reducer.make<string>(
    (self, that) => self + that,
    ""
)

Concat.combineAll(["a", "b", "c"])
// "abc"
```

The direction matters for non-commutative operations. `combineAll` does not
silently reverse or rebalance the source.

### Any `Iterable`

The method accepts `Iterable<A>`, not only arrays. That includes:

```text
Array
Set
generators
custom iterable structures
```

This can avoid materializing an intermediate array.

### Pairwise `combine`

Because `Reducer` extends `Combiner`, the same strategy can merge two values
that are already reduced:

```ts
Concat.combine("Effect", " Reducer")
// "Effect Reducer"
```

## 3. Optimize

### Custom `combineAll`

`make` accepts a third argument:

```ts
const Product = Reducer.make<number>(
    (a, b) => a * b,
    1,
    (values) => {
        let result = 1

        for (const value of values) {
            if (value === 0) {
                return 0
            }
            result *= value
        }

        return result
    }
)
```

This can short-circuit because zero is an absorbing value for multiplication.

### It is a complete replacement

The custom `combineAll` is not wrapped around the default implementation. It
completely replaces it.

That means the custom function owns:

```text
iteration
starting state
short-circuit behavior
final result
```

Effect does not check that it agrees with repeated calls to `combine`.

A useful reducer contract is therefore:

```text
combineAll([a, b, c])

has the same intended meaning as

combine(
    combine(
        combine(initialValue, a),
        b
    ),
    c
)
```

A custom implementation may compute that result more efficiently, but should not
invent an unrelated operation.

## 4. Flip

### `Reducer.flip`

```ts
import {
    Reducer,
    String,
} from "effect"

const Prepend = Reducer.flip(
    String.ReducerConcat
)

Prepend.combine("a", "b")
// "ba"

Prepend.combineAll(["a", "b", "c"])
// "cba"
```

`flip` reverses the argument order of the binary combine function:

```text
flipped.combine(self, that)
    = original.combine(that, self)
```

The source iterable is still consumed left-to-right. The reversed output above
comes from the changed pairwise operation, not from iterating the array
backwards.

### `initialValue` is preserved

The flipped reducer receives exactly the original reducer's `initialValue`.

### Custom `combineAll` is not preserved

This is the most important implementation detail in `flip`:

```ts
return Reducer.make(
    (self, that) =>
        reducer.combine(that, self),
    reducer.initialValue
)
```

No third argument is passed to `make`.

Therefore, if the original reducer has an optimized custom `combineAll`, the
flipped reducer gets a newly generated default left fold instead.

If the flipped version also requires specialized whole-collection behavior,
build it explicitly with `Reducer.make`.

## Pre-built reducers

Before defining a custom reducer, check the module for the value type you are
working with. The Reducer API docs call out examples such as:

```text
Number.ReducerSum
Number.ReducerMultiply
String.ReducerConcat
Boolean.ReducerAnd
Boolean.ReducerOr
```

These package the expected identity and combine rule together and are suitable
for reuse by other Effect APIs that accept reducers.

The Reducer docs specifically mention consumers such as:

```text
Struct.makeReducer
Option.makeReducer
Record.makeReducerUnion
```

## FoldKit boundary

Unlike `Redacted`, `Reducer` is not inherently effectful or secret-bearing. It is
a plain reusable reduction strategy.

For a FoldKit feature, keep user-visible state in the Schema-defined Model and
use reducers as implementation helpers where they clarify aggregation logic.
The teaching Model here stores only the selected stage/case names:

```text
stage
buildCase
foldCase
optimizeCase
flipCase
```

The reducer examples are module-level teaching values rather than additional UI
state.

A common pattern is:

```text
FoldKit Model
    explicit serializable state

update / domain helper
    uses a Reducer to aggregate values

next Model
    receives the reduced result
```

Reducers are especially useful when several updates, domain modules, or Effect
library functions need to share one combination rule.

## Type discipline

The generated demo contains no explicit `any` annotations.

Reducer callbacks, Message payloads, UI callbacks, and button attributes are
typed explicitly where contextual typing could otherwise be lost.

## Validation note

The artifact is syntax-checked with TypeScript and scanned for explicit `any`
annotations. Full package-aware typechecking should still be run after copying
the files into the URM workspace, where the real `effect`, `foldkit`, and
`@foldkit/ui` packages resolve.

## Integration expectation

Follow the same child-feature pattern as neighboring Learn demos only when you
are ready to integrate it:

1. add the child Model to the parent Learn Model,
2. add `ReducerDemo.Message` to the parent Message union,
3. initialize `ReducerDemo.init`,
4. delegate child messages to `ReducerDemo.update`,
5. render `ReducerDemo.view(...)` from the Reducer route.

This artifact intentionally performs none of those edits.
