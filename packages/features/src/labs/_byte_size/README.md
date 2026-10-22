# ByteSize

Based on:

- <https://effect.website/docs/v4/api/effect/ByteSize>

## Mental model

`ByteSize` represents an **exact, non-negative integral number of bytes**.

Its underlying exact count is bigint-like, but the branded type prevents
accidentally treating arbitrary bigint values as validated byte sizes.

The two unit systems stay explicit:

```text
SI decimal
  kB  = 1000 B
  MB  = 1000² B
  GB  = 1000³ B

IEC binary
  KiB = 1024 B
  MiB = 1024² B
  GiB = 1024³ B
```

So:

```text
1 MB  = 1,000,000 B
1 MiB = 1,048,576 B
```

They are not alternate spellings for the same quantity.

## Safe parsing

External text:

```ts
ByteSize.fromString(
  "1.5 kB"
)
// Some(1500 B)

ByteSize.fromString(
  "1.5 KiB"
)
// Some(1536 B)
```

Fractions are accepted only when they represent an exact integral number of
bytes:

```ts
ByteSize.fromString(
  "0.1 B"
)
// None
```

Unsupported units / syntax also return None.

Throwing variant:

```ts
ByteSize.fromStringUnsafe(...)
```

## String units

The parser accepts canonical unit symbols:

```text
B
kB MB GB TB PB EB ZB YB RB QB
KiB MiB GiB TiB PiB EiB ZiB YiB
```

and lowercase unit names such as:

```text
byte
bytes
kilobyte
kilobytes
mebibyte
mebibytes
```

## `Input` vs external strings

`ByteSize.Input` is the trusted constructor-input type and its typed string
forms describe non-negative integer quantities with canonical symbols / names.

For external strings — especially fractional quantities — use:

```ts
ByteSize.fromString
```

rather than forcing them into the `Input` template type.

## Constructors

Raw bytes:

```ts
ByteSize.bytes(1500)
```

Decimal SI:

```ts
ByteSize.kilobytes
ByteSize.megabytes
ByteSize.gigabytes
ByteSize.terabytes
ByteSize.petabytes
ByteSize.exabytes
ByteSize.zettabytes
ByteSize.yottabytes
ByteSize.ronnabytes
ByteSize.quettabytes
```

Binary IEC:

```ts
ByteSize.kibibytes
ByteSize.mebibytes
ByteSize.gibibytes
ByteSize.tebibytes
ByteSize.pebibytes
ByteSize.exbibytes
ByteSize.zebibytes
ByteSize.yobibytes
```

A `number` quantity is accepted only when the resulting byte count is an exact,
non-negative safe integer.

A `bigint` quantity can represent much larger exact values.

## Exact getters / conversion

Exact:

```ts
ByteSize.toBigInt(size)
```

Safe Number conversion:

```ts
ByteSize.toNumber(size)
// Option<number>
```

If the exact byte count exceeds the JavaScript safe integer range:

```text
None
```

Throwing version:

```ts
ByteSize.toNumberUnsafe(size)
```

Approximate conversion to a display unit:

```ts
ByteSize.toUnit(
  size,
  "MiB"
)
```

returns a JavaScript `number`.

That API is deliberately an approximate unit boundary; use `toBigInt` when you
need the exact byte count.

## Arithmetic

Exact addition:

```ts
ByteSize.sum(
  a,
  b
)
```

Safe subtraction:

```ts
ByteSize.subtract(
  ByteSize.megabytes(10),
  ByteSize.megabytes(3)
)
// Some(7 MB)
```

Underflow:

```ts
ByteSize.subtract(
  ByteSize.megabytes(3),
  ByteSize.megabytes(10)
)
// None
```

Throwing variant:

```ts
ByteSize.subtractUnsafe(...)
```

### Integer scalar multiplication

```ts
ByteSize.times(
  ByteSize.kibibytes(4),
  3
)
// Some(12 KiB)
```

The multiplier must be a non-negative integer.

```ts
ByteSize.times(
  ByteSize.bytes(10),
  1.5
)
// None
```

### Integer division

```ts
ByteSize.divide(
  ByteSize.bytes(10),
  3
)
// Some(3 B)
```

The divisor must be a positive integer and any remainder is discarded.

Zero / negative / non-integer divisors return None.

## Comparison

Instances:

```ts
ByteSize.Order
ByteSize.Equivalence
```

Helpers:

```ts
ByteSize.equals

ByteSize.isLessThan
ByteSize.isLessThanOrEqualTo
ByteSize.isGreaterThan
ByteSize.isGreaterThanOrEqualTo

ByteSize.between
ByteSize.clamp

ByteSize.min
ByteSize.max
```

Because ByteSize is exact bytes underneath, comparison is straightforward exact
integer comparison.

## Formatting

Automatic binary formatting is the default unless `system: "decimal"` is
specified.

```ts
ByteSize.format(
  ByteSize.bytes(1_572_864),
  {
    system: "binary"
  }
)
// 1.5 MiB
```

Decimal:

```ts
ByteSize.format(
  ByteSize.bytes(1_500_000),
  {
    system: "decimal"
  }
)
// 1.5 MB
```

Force a unit:

```ts
ByteSize.format(
  value,
  {
    unit: "kB"
  }
)
```

Precision:

```ts
ByteSize.format(
  value,
  {
    unit: "KiB",
    precision: 3,
    trailingZeros: true
  }
)
```

`precision` must be an integer from 0 through 20.

`trailingZeros` defaults to false.

## Formatting systems constrain units

The options are typed so decimal and binary unit choices line up:

```ts
{
  system: "decimal",
  unit: "MB"
}
```

or:

```ts
{
  system: "binary",
  unit: "MiB"
}
```

This prevents accidentally asking binary formatting for a decimal-only unit in
typed code.

## Algebra instances

Sum through a generic Reducer API:

```ts
ByteSize.ReducerSum
```

Its identity is `ByteSize.zero`.

Non-empty max/min combination:

```ts
ByteSize.CombinerMax
ByteSize.CombinerMin
```

These mirror the BigInt algebra underneath while retaining the ByteSize brand.

## Zero / brand checks

```ts
ByteSize.zero

ByteSize.isByteSize(value)
ByteSize.isZero(value)
```

`isByteSize` identifies a validated branded ByteSize value.

## Why use ByteSize instead of plain number?

A plain number such as:

```ts
10
```

doesn't say whether it means:

```text
bytes
kilobytes
megabytes
MiB
```

and may become unsafe for very large exact byte counts.

ByteSize makes both concerns explicit:

```text
unit at construction / parsing
+
exact byte count afterward
```

It is useful for:

- file sizes
- upload limits
- cache/storage quotas
- payload limits
- memory sizes
- infrastructure/configuration values
- telemetry sizes

## Real Effect 4 APIs used

The source uses:

- `ByteSize.fromString`
- `ByteSize.bytes`
- decimal unit constructors
- binary unit constructors
- `ByteSize.toBigInt`
- `ByteSize.toNumber`
- `ByteSize.toUnit`
- `ByteSize.sum`
- `ByteSize.subtract`
- `ByteSize.times`
- `ByteSize.divide`
- `ByteSize.format`
- `ByteSize.between`
- `ByteSize.clamp`
- `ByteSize.ReducerSum`
- `ByteSize.CombinerMax`
- `Option`

The README also covers:

- `fromStringUnsafe`
- `fromInput`
- `fromInputUnsafe`
- `toNumberUnsafe`
- `Order`
- `Equivalence`
- comparison helpers
- `subtractUnsafe`
- `CombinerMin`
- `zero`
- `isByteSize`
- `isZero`
