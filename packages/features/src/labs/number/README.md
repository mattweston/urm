# Effect 4 Number — Foldkit visual demo

## Mental model

Effect's `Number` module wraps common numeric operations in the same
pipe-friendly, typed style as the rest of Effect.

The most useful differences from reaching directly for JavaScript operators are:

- safe parsing with `Option`
- safe division with `Option`
- reusable `Order` / range helpers
- reusable numeric `Reducer` instances

## The four sections

### 1. Parse / Guard

Parse numeric text safely:

```ts
Number.parse("42")
// Option.some(42)

Number.parse("3.14")
// Option.some(3.14)

Number.parse("not a number")
// Option.none()
```

The special strings are intentionally supported:

```ts
Number.parse("NaN")
// Option.some(NaN)

Number.parse("Infinity")
// Option.some(Infinity)

Number.parse("-Infinity")
// Option.some(-Infinity)
```

Blank strings return `Option.none()`.

Runtime guard:

```ts
Number.isNumber(value)
// value is number
```

Like JavaScript's `typeof`, `NaN` and `Infinity` are still numbers, so
`isNumber` is not a finite-number check.

### 2. Arithmetic

Dual, pipe-friendly arithmetic helpers include:

```ts
Number.sum(12, 4)
Number.subtract(12, 4)
Number.multiply(12, 4)
Number.remainder(12, 5)
Number.round(1.567, 2)
```

Safe division:

```ts
Number.divide(12, 4)
// Option.some(3)

Number.divide(12, 0)
// Option.none()
```

Unsafe variant:

```ts
Number.divideUnsafe(12, 4)
// 3
```

`divideUnsafe` throws `RangeError` when the divisor is zero.

### 3. Range / Order

Inclusive range check:

```ts
const inside = Number.between({
  minimum: 0,
  maximum: 10
})

inside(4)
// true
```

Force a value into a range:

```ts
const clamp = Number.clamp({
  minimum: 0,
  maximum: 10
})

clamp(-3) // 0
clamp(14) // 10
```

Sign classification:

```ts
Number.sign(-5) // -1
Number.sign(0) // 0
Number.sign(5) // 1
```

Standard numeric order:

```ts
Number.Order(1, 2) // -1
Number.Order(2, 1) // 1
Number.Order(1, 1) // 0
```

The module also includes:

- `isLessThan`
- `isLessThanOrEqualTo`
- `isGreaterThan`
- `isGreaterThanOrEqualTo`
- `min`
- `max`

### 4. Aggregate

Direct iterable operations:

```ts
Number.sumAll([3, 5, 2, 8])
// 18

Number.multiplyAll([3, 5, 2, 8])
// 240
```

Reusable Reducers:

```ts
Number.ReducerSum
Number.ReducerMultiply
Number.ReducerMin
Number.ReducerMax
```

Example:

```ts
Number.ReducerSum.combineAll([
  3, 5, 2, 8
])
// 18
```

The lesson also includes:

```ts
Number.nextPow2(17)
// 32
```

which is useful for capacity / bucket sizing.

## Real Effect 4 APIs used

- `Number.parse`
- `Number.isNumber`
- `Number.sum`
- `Number.subtract`
- `Number.multiply`
- `Number.divide`
- `Number.divideUnsafe`
- `Number.remainder`
- `Number.round`
- `Number.between`
- `Number.clamp`
- `Number.sign`
- `Number.Order`
- `Number.sumAll`
- `Number.multiplyAll`
- `Number.ReducerSum`
- `Number.ReducerMultiply`
- `Number.ReducerMin`
- `Number.ReducerMax`
- `Number.nextPow2`
- `Option`
