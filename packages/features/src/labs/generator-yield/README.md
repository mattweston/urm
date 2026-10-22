# Foldkit `yield*` / `Effect.gen`

## Lesson

Four interactive stages:

1. **Unwrap** — `yield*` turns the success channel into an ordinary local value.
2. **Channels** — the whole `Effect.gen` program still accumulates error and requirement types.
3. **Fail fast** — the first failed yielded Effect stops later generator statements.
4. **Narrowing** — `return yield* Effect.fail(...)` makes the failing branch visibly exit for TypeScript control-flow narrowing.

## Real Effect source

`yield-star.ts` contains compiled examples using:

- `Effect.gen`
- `yield*` on Effect services and effects
- `Context.Service`
- `Data.TaggedError`
- `Effect.fail`
- the explicit `return yield*` narrowing pattern
