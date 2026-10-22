# Deferred

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/Deferred

Reference page checked against Effect `4.0.0-rc.115` and the current
`packages/effect/src/Deferred.ts` source.

## Files

- `deferred.ts` — Foldkit Model / Message / update plus deterministic Deferred
  snapshots built with the real Effect API.
- `deferred.view.ts` — visual Foldkit UI.
- `deferred-preview.png` — static preview of the default Wait stage.

## Intended location

```text
packages/features/src/labs/deferred/
├── deferred.ts
└── deferred.view.ts
```

No parent router/model/message/update files are changed by this package.

## Teaching stages

### 1. Wait

Shows the lifecycle of a one-time coordination cell:

```text
empty
  ↓
two fibers await
  ↓
one producer completes
  ↓
both fibers resume with the same result
```

APIs shown:

- `Deferred.make`
- `Deferred.await`
- `Deferred.succeed`
- `Deferred.isDone`
- `Deferred.poll`
- `Deferred.isDeferred`

The key point is that `await` suspends an Effect fiber rather than blocking an
operating-system thread.

### 2. Complete

Runs two completion attempts against one real `Deferred`.

The first call returns `true`, the second returns `false`, and `await` observes
the first value. Toggle the producer order to make the one-shot race explicit.

APIs shown:

- `Deferred.succeed`
- `Deferred.sync`
- `Deferred.done`
- `Deferred.doneUnsafe`
- `Deferred.isDone`
- `Deferred.isDoneUnsafe`

### 3. Outcomes

Shows the four ways the stored Effect result can resume an awaiter:

- success — `Deferred.succeed`
- typed failure — `Deferred.fail`
- defect — `Deferred.die`
- interruption — `Deferred.interrupt` / `interruptWith`

It also calls out the distinction between the typed `E` channel and defects /
interruptions carried by Effect's full Cause.

Additional APIs shown:

- `Deferred.failSync`
- `Deferred.failCause`
- `Deferred.dieSync`
- `Deferred.into`

### 4. Memoize

Uses a side-effect counter to make this subtle API difference visible.

`Deferred.complete`:

```text
completion runs source once
awaiter 1 -> 1
awaiter 2 -> 1
evaluations -> 1
```

`Deferred.completeWith`:

```text
completion stores source without running it
awaiter 1 -> 1
awaiter 2 -> 2
evaluations -> 2
```

The source documentation explicitly notes that `completeWith` does not memoize
the stored Effect; each awaiter may execute it independently.

## Current API notes

- A `Deferred<A, E>` starts empty and can be completed exactly once.
- Any number of fibers can await the same Deferred.
- Completion attempts return `true` for the winner and `false` once the cell is
  already done.
- `poll` returns `Option.some(effect)` only after completion.
- `makeUnsafe`, `isDoneUnsafe`, and `doneUnsafe` are low-level synchronous APIs;
  prefer their Effect counterparts in ordinary application code.
- `complete` runs an Effect once and stores its result.
- `completeWith` stores an environment-free Effect directly and does not
  memoize it.
- `into` pipes an Effect's complete result — success, failure, defect, or
  interruption — into a Deferred.

## Integration expectation

Follow the same integration pattern as the existing `learn/console/*`,
`learn/context/*`, etc.:

1. add the child Model to the parent learn Model,
2. include `DeferredDemo.Message` in the parent Message union,
3. initialize `DeferredDemo.init`,
4. delegate matching messages to `DeferredDemo.update`,
5. render `DeferredDemo.view(...)` from the Deferred route.

This artifact intentionally does **not** apply any of those edits.
