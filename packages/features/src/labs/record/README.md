# Effect 4 Record — Foldkit visual demo

## What Effect Record is for

The `Record` module provides typed, functional helpers for JavaScript
`Record` / object values.

A useful mental model is:

```ts
Record<string, A>
```

is still an ordinary JavaScript object, while the Effect `Record` module gives
you composable operations for safe lookup, immutable-style updates,
transformations, filtering, partitioning, and folding.

## The four sections

### 1. Lookup & update

Safe lookup uses `Option`:

```ts
Record.get(scores, "ada")
// Option.some(92)

Record.get(scores, "missing")
// Option.none()
```

The demo also shows:

```ts
Record.set(scores, "katherine", 88)
Record.remove(scores, "alan")
Record.modify(scores, "ada", (score) => score + 5)
```

`modify` returns `Option` because the requested key might not exist.

### 2. Transform

`Record.map` transforms values while preserving keys:

```ts
Record.map(scores, (score) => score * 2)
```

The callback also receives the key:

```ts
Record.map(
  scores,
  (score, key) => `${key}:${score}`
)
```

### 3. Filter & partition

`filter` keeps matching entries:

```ts
Record.filter(
  scores,
  (score) => score >= 75
)
```

`partition` uses `Result` to split one Record into failure and success Records
while preserving the original keys:

```ts
const [below, passing] = Record.partition(
  scores,
  (score) =>
    score >= 75
      ? Result.succeed(score)
      : Result.fail(score)
)
```

### 4. Convert & fold

The demo covers:

- `Record.keys`
- `Record.values`
- `Record.toEntries`
- `Record.collect`
- `Record.reduce`

Example:

```ts
Record.reduce(
  scores,
  0,
  (total, score) => total + score
)
```

## Real Effect 4 APIs in `examples/record.ts`

The source uses:

- `Record.fromEntries`
- `Record.get`
- `Record.set`
- `Record.remove`
- `Record.modify`
- `Record.map`
- `Record.filter`
- `Record.partition`
- `Record.keys`
- `Record.values`
- `Record.toEntries`
- `Record.collect`
- `Record.reduce`
- `Option`
- `Result`
