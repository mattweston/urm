# BigDecimal

Based on:

- <https://effect.website/docs/v4/api/effect/BigDecimal>

## Mental model

`BigDecimal` represents arbitrary-precision decimal values with two pieces of
storage:

```ts
{
  value: bigint
  scale: number
}
```

For example:

```text
123.45
```

is represented as:

```text
value = 12345n
scale = 2
```

because:

```text
12345 × 10^-2 = 123.45
```

That representation avoids JavaScript's binary floating-point representation
error for decimal arithmetic.

The classic comparison:

```ts
0.1 + 0.2
// 0.30000000000000004
```

versus:

```ts
BigDecimal.sum(
  BigDecimal.fromStringUnsafe("0.1"),
  BigDecimal.fromStringUnsafe("0.2")
)
```

formats as:

```text
0.3
```

## When to use it

Use `BigDecimal` when decimal arithmetic itself must remain decimal:

- money-like quantities
- measurements with decimal precision
- rates
- user-entered exact decimal values
- business calculations where binary floating-point artifacts are undesirable

Do not convert to JavaScript `number` until an interop boundary actually
requires one.

## 1. Safe parsing

Parse external text with:

```ts
BigDecimal.fromString(
  text
)
```

Return type:

```ts
Option<BigDecimal>
```

Valid:

```ts
BigDecimal.fromString(
  "123.456"
)
// Option.some(...)

BigDecimal.fromString(
  "1.25e3"
)
// Option.some(1250)
```

Invalid:

```ts
BigDecimal.fromString(
  "123.abc"
)
// Option.none()
```

An interesting current behavior:

```ts
BigDecimal.fromString("")
// Option.some(0)
```

The empty string parses as zero.

## Unsafe string parsing

```ts
BigDecimal.fromStringUnsafe(
  text
)
```

accepts the same syntax but throws when invalid.

Use the safe version for external/user input.

The unsafe version is convenient for literals that are expected to be valid:

```ts
const taxRate =
  BigDecimal.fromStringUnsafe(
    "0.2"
  )
```

## Numbers

Safe finite conversion:

```ts
BigDecimal.fromNumber(
  number
)
```

returns:

```ts
Option<BigDecimal>
```

because:

```text
NaN
Infinity
-Infinity
```

cannot be represented.

Unsafe version:

```ts
BigDecimal.fromNumberUnsafe(...)
```

throws for non-finite input.

Remember that a JavaScript number may already contain binary floating-point
rounding before BigDecimal receives it.

For exact decimal input, string parsing is often the better boundary.

## BigInt

For integer values:

```ts
BigDecimal.fromBigInt(
  42n
)
```

produces an integer decimal at scale 0.

## Direct construction

```ts
BigDecimal.make(
  12345n,
  2
)
```

means:

```text
123.45
```

The scale must be a safe JavaScript integer.

# 2. Normalization

Equivalent values can have different storage:

```text
1.0
  value = 10n
  scale = 1

1.00
  value = 100n
  scale = 2
```

Normalize:

```ts
BigDecimal.normalize(
  decimal
)
```

removes trailing decimal zeros.

For:

```text
123.4500
```

storage begins as:

```text
value = 1234500n
scale = 4
```

and normalizes to:

```text
value = 12345n
scale = 2
```

Very large integer values can normalize into a **negative scale**.

Example:

```text
12300000
```

can normalize to:

```text
value = 123n
scale = -5
```

because:

```text
123 × 10^5
```

is the same value.

# 3. Arithmetic

## Add

```ts
BigDecimal.sum(
  a,
  b
)
```

aligns differing scales and adds their bigint values.

Aggregate:

```ts
BigDecimal.sumAll(
  decimals
)
```

## Subtract

```ts
BigDecimal.subtract(
  a,
  b
)
```

## Multiply

```ts
BigDecimal.multiply(
  a,
  b
)
```

multiplies unscaled integer values and adds scales.

Aggregate:

```ts
BigDecimal.multiplyAll(
  decimals
)
```

## Safe divide

```ts
BigDecimal.divide(
  numerator,
  denominator
)
```

returns:

```ts
Option<BigDecimal>
```

Division by zero:

```ts
BigDecimal.divide(
  one,
  zero
)
// Option.none()
```

For a non-terminating decimal quotient such as:

```text
1 / 3
```

the implementation computes up to its default decimal division precision.

## Unsafe divide

```ts
BigDecimal.divideUnsafe(...)
```

returns a `BigDecimal` directly but throws `RangeError` for division by zero.

## Remainder

Safe:

```ts
BigDecimal.remainder(
  value,
  divisor
)
```

returns:

```ts
Option<BigDecimal>
```

Unsafe:

```ts
BigDecimal.remainderUnsafe(...)
```

throws on zero divisor.

# 4. Scale

```ts
BigDecimal.scale(
  value,
  targetScale
)
```

changes the represented scale.

Increasing scale adds decimal zeros to storage without changing value.

Example:

```ts
BigDecimal.scale(
  BigDecimal.fromStringUnsafe(
    "123.45"
  ),
  4
)
```

has storage:

```text
value = 1234500n
scale = 4
```

while formatting remains:

```text
123.45
```

Decreasing scale discards digits using bigint division, which truncates toward
zero:

```ts
BigDecimal.scale(
  BigDecimal.fromStringUnsafe(
    "123.45"
  ),
  1
)
// 123.4
```

If you want a chosen rounding policy rather than truncation, use `round`.

# 5. Rounding

```ts
BigDecimal.round(
  value,
  {
    scale,
    mode
  }
)
```

Default mode:

```text
half-from-zero
```

Default scale:

```text
0
```

Current modes:

```text
ceil
floor
to-zero
from-zero

half-ceil
half-floor
half-to-zero
half-from-zero
half-even
half-odd
```

## Scale meaning

Positive scale:

```text
digits to the right of decimal point
```

Example:

```text
scale 2
→ hundredths
```

Zero:

```text
integer
```

Negative scale:

```text
positions left of decimal point
```

Example:

```text
scale -1
→ tens
```

So:

```ts
BigDecimal.round(
  BigDecimal.fromStringUnsafe(
    "145"
  ),
  {
    scale: -1,
    mode: "from-zero"
  }
)
// 150
```

## Half-even

Banker's-style midpoint behavior:

```ts
BigDecimal.round(
  BigDecimal.fromStringUnsafe(
    "2.5"
  ),
  {
    scale: 0,
    mode: "half-even"
  }
)
// 2
```

because 2 is even.

## Half-odd

```ts
BigDecimal.round(
  BigDecimal.fromStringUnsafe(
    "2.5"
  ),
  {
    scale: 0,
    mode: "half-odd"
  }
)
// 3
```

because 3 is odd.

## Fixed helpers

Toward zero:

```ts
BigDecimal.truncate(
  value,
  scale
)
```

Toward positive infinity:

```ts
BigDecimal.ceil(
  value,
  scale
)
```

Toward negative infinity:

```ts
BigDecimal.floor(
  value,
  scale
)
```

# 6. Equality and ordering

Value equality:

```ts
BigDecimal.equals(
  BigDecimal.fromStringUnsafe(
    "1.0"
  ),
  BigDecimal.fromStringUnsafe(
    "1.00"
  )
)
// true
```

The comparison is about decimal value, not identical raw storage.

Reusable instances:

```ts
BigDecimal.Equivalence
BigDecimal.Order
```

The module also provides direct predicates:

```ts
BigDecimal.isLessThan
BigDecimal.isLessThanOrEqualTo
BigDecimal.isGreaterThan
BigDecimal.isGreaterThanOrEqualTo
```

# 7. Ranges

Check an inclusive range:

```ts
BigDecimal.between(
  value,
  {
    minimum,
    maximum
  }
)
```

Force a value into the inclusive range:

```ts
BigDecimal.clamp(
  value,
  {
    minimum,
    maximum
  }
)
```

Also:

```ts
BigDecimal.min
BigDecimal.max
```

# 8. Sign helpers

```ts
BigDecimal.sign(value)
```

returns:

```text
-1
0
1
```

Other helpers:

```ts
BigDecimal.abs
BigDecimal.negate

BigDecimal.isNegative
BigDecimal.isPositive
BigDecimal.isZero
BigDecimal.isInteger
```

# 9. Formatting

Plain decimal rendering when practical:

```ts
BigDecimal.format(
  value
)
```

The value is normalized before formatting.

For normalized scales whose absolute size is at least 16, `format` uses
scientific notation.

Always request scientific notation with:

```ts
BigDecimal.toExponential(
  value
)
```

# 10. Converting to JavaScript number

```ts
BigDecimal.toNumberUnsafe(
  value
)
```

is explicitly unsafe.

The result can:

- lose integer precision
- lose fractional precision
- round to another representable binary float
- become `Infinity`

Use:

```ts
BigDecimal.format(value)
```

when preserving the decimal value as text is sufficient.

Convert to `number` only at an interop boundary that actually requires it.

# 11. Pipe-friendly API

Most binary operations are dual.

Data-first:

```ts
BigDecimal.sum(
  a,
  b
)
```

Data-last:

```ts
pipe(
  a,
  BigDecimal.sum(b)
)
```

The same pattern applies across arithmetic and comparison helpers.

# Real Effect 4 APIs used

The source includes:

- `BigDecimal.fromString`
- `BigDecimal.fromStringUnsafe`
- `BigDecimal.make`
- `BigDecimal.normalize`
- `BigDecimal.format`
- `BigDecimal.sum`
- `BigDecimal.multiply`
- `BigDecimal.divide`
- `BigDecimal.remainder`
- `BigDecimal.scale`
- `BigDecimal.round`
- `BigDecimal.equals`
- `BigDecimal.Order`
- `BigDecimal.clamp`
- `BigDecimal.sign`
- `BigDecimal.abs`
- `BigDecimal.isInteger`
- `BigDecimal.isNegative`
- `BigDecimal.isZero`
- `BigDecimal.toExponential`
- `BigDecimal.toNumberUnsafe`
- `Option`

The README also covers:

- `fromNumber` / `fromNumberUnsafe`
- `fromBigInt`
- `sumAll`
- `subtract`
- `multiplyAll`
- `divideUnsafe`
- `remainderUnsafe`
- comparison predicates
- `between`
- `min` / `max`
- `negate`
- `truncate`
- `ceil`
- `floor`

## Suggested placement

```text
packages/features/src/learn/foldkit/
├── examples/
│   └── big-decimal.ts
└── big-decimal.view.ts
```
