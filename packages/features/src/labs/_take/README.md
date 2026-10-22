# Take

Standalone Foldkit lesson for `effect/Take`.

The repository scaffold under `packages/features/src/labs/_take/` is intentionally left untouched. These files are generated under `/mnt/data/take/` only.

## Lesson shape

The UI uses four stages:

- **Represent** — understand `Take<A, E, Done>` as `NonEmptyReadonlyArray<A> | Exit.Exit<Done, E>`.
- **Emit** — see how an emitted non-empty batch becomes a successful `Pull` through `Take.toPull`.
- **Fail** — keep an ordinary `E` failure distinct from normal completion.
- **Complete** — translate a successful `Exit<Done>` into `Cause.Done<Done>` and recover it with `Pull.catchDone` when needed.

The Foldkit model contains only serializable stage/case selections. Runtime `Take`, `Exit`, and `Pull` values remain module-level Effect examples.

## Live API

The live Effect v4 reference currently renders **4.0.0-rc.117** and **2 exports**:

### Models

- `Take`

### Converting

- `toPull`

The workspace pin (`4.0.0-rc.112`) and live rc.117 source are byte-identical for this module, so no compatibility shim is required.

## Core representation

```ts
Take.Take<A, E, Done>
// = NonEmptyReadonlyArray<A> | Exit.Exit<Done, E>
```

That union has three semantic outcomes even though it has only two structural branches:

1. a non-empty array means **values were emitted**;
2. a failed `Exit` means **ordinary failure**;
3. a successful `Exit` means **normal completion**, carrying the `Done` value.

There is no dedicated runtime `Take` class or `_tag` added by this module. A stored `Take` is just the batch or `Exit` value itself.

## `toPull`

`Take.toPull` interprets the stored representation back into the low-level pull protocol:

```ts
const batch: Take.Take<number, string, string> = [1, 2, 3]
const failed: Take.Take<number, string, string> = Exit.fail("boom")
const done: Take.Take<number, string, string> = Exit.succeed("eof")

Take.toPull(batch)
Take.toPull(failed)
Take.toPull(done)
```

Semantically:

- batch → `Effect.succeed(batch)`;
- failed `Exit` → the same failed exit / ordinary `E` failure;
- successful `Exit<Done>` → `Cause.done(done)`.

`Pull.Pull<A, E, Done>` extends an Effect whose error side includes `Cause.Done<Done>`. That is why normal completion is represented as a cause signal rather than a successful emitted value.

## Why batches are non-empty

A pull that succeeds represents actual emitted data. An empty emitted batch would be ambiguous and useless, so `Take` requires `NonEmptyReadonlyArray<A>` for the emission branch. End-of-stream is represented by the successful `Exit` branch instead.

This is also why one `Take` may contain multiple `A` values: stream internals pull arrays/chunks to amortize effect evaluation.

## Failure versus completion

Both failure and completion are stored as `Exit`, but they remain distinct after `toPull`:

- `Exit.fail(error)` becomes an ordinary typed `E` failure;
- `Exit.succeed(done)` becomes `Cause.Done<Done>`.

`Pull.catchDone` handles only the completion signal, leaving ordinary failures untouched:

```ts
const completion = Pull.catchDone(
  Take.toPull(Exit.succeed("eof")),
  (done) => Effect.succeed(done)
)
```

This makes a non-`void` `Done` useful for final cursors, counts, offsets, or producer status.

## When Take is useful

`Take` is useful when a pull result needs to become data for a while: queueing it, publishing it, deferring it, storing it, or transferring it across an asynchronous boundary. The batch/failure/completion meaning can later be restored with `toPull`.

For ordinary high-level stream transformations, prefer `Stream` combinators instead of manually manipulating `Take` values.

## Generated files

- `take.ts` — real Effect examples, serializable Foldkit model, messages, update function, stage copy and snapshots.
- `take.view.ts` — generic Foldkit UI lesson view.
- `take-preview.png` — static preview of the initial `Represent / Union` state.
- `take-bundle.zip` — bundle containing the files above plus this README.

## Validation

The generated TypeScript is checked standalone with `tsc --noEmit --noResolve`. Only unresolved workspace package imports (`effect`, `foldkit`, `foldkit/message`, `foldkit/struct`, `@foldkit/ui`, `foldkit/html`) are expected in that isolated mode. Generated source should contain no explicit `any` annotations.
