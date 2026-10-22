# BigInt

Based on the current Effect v4 API:

- <https://effect.website/docs/v4/api/effect/BigInt>

The API reference was `effect 4.0.0-rc.115` when this demo was built.

## Mental model

`bigint` is exact arbitrary-size **integer** arithmetic.

Effect's `BigInt` module adds:

- safe `Option` conversions
- pipe-friendly math
- safe division / square root
- comparison and range helpers
- `gcd` / `lcm`
- iterable aggregates
- reusable `Reducer` / `Combiner` instances

Use:

```text
BigInt
  exact integer

BigDecimal
  exact decimal representation

Number
  IEEE-754 binary floating-point number
```

## Safe text parsing

```ts
BigInt.fromString("42")
// Option.some(42n)

BigInt.fromString("12.5")
// Option.none()

BigInt.fromString(" ")
// Option.none()
```

This differs from the native constructor:

```ts
BigInt.BigInt(" ")
// 0n
```

and native constructor calls may throw for invalid input.

## Safe Number boundaries

```ts
BigInt.fromNumber(42)
// Some(42n)

BigInt.fromNumber(
  Number.MAX_SAFE_INTEGER + 1
)
// None
```

The reverse is also checked:

```ts
BigInt.toNumber(42n)
// Some(42)

BigInt.toNumber(
  9007199254740992n
)
// None
```

This prevents silent integer precision loss at the Number boundary.

## Exact arithmetic

```ts
BigInt.sum
BigInt.multiply
BigInt.subtract
BigInt.increment
BigInt.decrement
```

work with arbitrarily large integers.

Example:

```ts
BigInt.sum(
  9007199254740993n,
  7n
)
// 9007199254741000n
```

## Integer division

Safe:

```ts
BigInt.divide(
  17n,
  5n
)
// Some(3n)
```

Division truncates toward zero:

```text
17n / 5n   → 3n
-17n / 5n  → -3n
```

Zero:

```ts
BigInt.divide(
  17n,
  0n
)
// None
```

Unsafe:

```ts
BigInt.divideUnsafe(
  17n,
  0n
)
// throws RangeError
```

Use `BigDecimal` if you need a fractional quotient.

## Remainder

```ts
BigInt.remainder(
  -17n,
  5n
)
// -2n
```

This follows native JavaScript bigint `%` semantics and throws when the divisor
is `0n`.

## GCD / LCM

```ts
BigInt.gcd(
  48n,
  18n
)
// 6n

BigInt.lcm(
  48n,
  18n
)
// 144n
```

`lcm` returns `0n` when either input is zero.

## Integer square root

```ts
BigInt.sqrt(
  144n
)
// Some(12n)
```

For a non-perfect square:

```ts
BigInt.sqrt(
  99n
)
// Some(9n)
```

The result is the largest bigint whose square is less than or equal to the
input.

Negative:

```ts
BigInt.sqrt(-1n)
// None
```

Unsafe:

```ts
BigInt.sqrtUnsafe(-1n)
// throws RangeError
```

## Comparison / ranges

Instances:

```ts
BigInt.Order
BigInt.Equivalence
```

Predicates:

```ts
BigInt.isLessThan
BigInt.isLessThanOrEqualTo
BigInt.isGreaterThan
BigInt.isGreaterThanOrEqualTo
```

Range helpers:

```ts
BigInt.between(
  value,
  {
    minimum,
    maximum
  }
)

BigInt.clamp(
  value,
  {
    minimum,
    maximum
  }
)
```

Also:

```ts
BigInt.min
BigInt.max
BigInt.sign
BigInt.abs
```

## Direct aggregation

```ts
BigInt.sumAll([
  2n,
  3n,
  4n
])
// 9n
```

Empty identity:

```text
0n
```

Product:

```ts
BigInt.multiplyAll([
  2n,
  3n,
  4n
])
// 24n
```

Empty identity:

```text
1n
```

## Effect 4 Reducers

```ts
BigInt.ReducerSum
BigInt.ReducerMultiply
```

These are reusable `Reducer<bigint>` values for generic APIs.

```ts
BigInt.ReducerSum.combineAll([
  2n,
  3n,
  4n
])
// 9n
```

Their identities are `0n` and `1n`.

## Effect 4 Combiners

```ts
BigInt.CombinerMax
BigInt.CombinerMin
```

For generic APIs that combine non-empty bigint values pairwise:

```ts
BigInt.CombinerMax.combine(
  12n,
  99n
)
// 99n
```

## BigInt vs BigDecimal

BigInt fits:

```text
large integer counters
integer IDs
exact smallest currency units
number theory
combinatorics
integer-only domain quantities
```

BigDecimal fits:

```text
fractional currency/rates
decimal measurements
precise decimal input
fractional division
rounding modes
```

## Real Effect 4 APIs used

- `BigInt.fromString`
- `BigInt.fromNumber`
- `BigInt.toNumber`
- `BigInt.sum`
- `BigInt.multiply`
- `BigInt.subtract`
- `BigInt.divide`
- `BigInt.remainder`
- `BigInt.gcd`
- `BigInt.lcm`
- `BigInt.sqrt`
- `BigInt.between`
- `BigInt.clamp`
- `BigInt.sumAll`
- `BigInt.multiplyAll`
- `BigInt.ReducerSum`
- `BigInt.ReducerMultiply`
- `BigInt.CombinerMax`
- `BigInt.CombinerMin`
- `Option`

The README also covers native `BigInt.BigInt`, `isBigInt`, increment/decrement,
unsafe division/sqrt, ordering, equivalence, min/max, sign, and abs.
