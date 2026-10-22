# Scheduler

Standalone Foldkit teaching demo for:

https://effect.website/docs/v4/api/effect/Scheduler

The live Effect v4 API reference currently displays `4.0.0-rc.116` and contains
six exports. The implementation also follows the vendored Effect source under
`.context/effect` and the Foldkit Model / Message / update / view conventions in
`.context/foldkit`.

## Files

- `scheduler.ts` — real Effect / Scheduler examples, Schema model, messages,
  update, and visual teaching snapshots.
- `scheduler.view.ts` — interactive Foldkit view.

## Intended location

```text
packages/features/src/labs/_scheduler/
├── README.md
├── scheduler.ts
└── scheduler.view.ts
```

This artifact intentionally does not edit that scaffold, any parent router,
Model, Message, update function, export map, or Git state.

## What Scheduler is for

`Scheduler` is low-level runtime machinery for dispatching runnable Effect fiber
work.

It answers three related questions:

```text
How are runnable callbacks queued?
In what order do queued callbacks run?
When should a long-running fiber yield so other work can run?
```

It is not the same abstraction as `Schedule`. `Schedule` describes recurrence,
retry, repetition, and delays for Effects. `Scheduler` controls runtime task
dispatch and cooperative fiber fairness.

## Public surface

The current API exposes six names:

### Models

- `MixedScheduler`
- `SchedulerDispatcher`

### Services

- `Scheduler` — the `Context.Reference<Scheduler>` value.
- `Scheduler` — the interface used by scheduler implementations.
- `MaxOpsBeforeYield`
- `PreventSchedulerYield`

The value/interface pair share the same TypeScript name and occupy different
namespaces, which is normal TypeScript declaration merging behavior.

## 1. Scheduler service

The runtime scheduler is obtained through a `Context.Reference`:

```ts
const scheduler = yield* Scheduler.Scheduler
```

Its default value is a new `MixedScheduler`, whose default execution mode is
`"async"`.

A different implementation can be provided to a scoped Effect:

```ts
const sync = new Scheduler.MixedScheduler("sync")

const mode = yield* Effect.provideService(
    Effect.map(
        Scheduler.Scheduler,
        (scheduler) => scheduler.executionMode
    ),
    Scheduler.Scheduler,
    sync
)
```

This is a scoped context override, not process-global mutation.

## 2. Scheduler interface

A scheduler implementation has three pieces:

```ts
interface Scheduler {
    readonly executionMode: "sync" | "async"
    shouldYield(fiber: Fiber<unknown, unknown>): boolean
    makeDispatcher(): SchedulerDispatcher
}
```

`MixedScheduler` is Effect's default implementation, not the only possible one.

## 3. Dispatcher

A dispatcher is deliberately tiny:

```ts
interface SchedulerDispatcher {
    scheduleTask(
        task: () => void,
        priority: number
    ): void

    flush(): void
}
```

`makeDispatcher()` creates one dispatcher with its own pending queue.

`flush()` drains already queued work synchronously, which is particularly useful
in deterministic tests.

## 4. Priority ordering

`MixedScheduler` orders numeric priorities from smallest to largest.

```text
priority 0
priority 5: first
priority 5: second
priority 10
```

Equal priorities preserve FIFO insertion order.

The demo's real `dispatcher_order_example` schedules `10`, `0`, `5:a`, and
`5:b`, then flushes them to produce:

```text
0 → 5:a → 5:b → 10
```

## 5. Execution modes

`MixedScheduler` accepts:

```text
"async"   default
"sync"
```

The mode chooses how the dispatcher's pending drain is awakened:

- async mode uses `setImmediate` when available, otherwise `setTimeout(0)`;
- sync mode uses a microtask-style Promise continuation.

This is scheduler dispatch policy. It is not a promise that arbitrary Effects
can be executed synchronously.

## 6. Yield policy

`MixedScheduler.shouldYield` currently evaluates:

```text
fiber.currentOpCount >= fiber.maxOpsBeforeYield
```

The threshold comparison is inclusive.

### `MaxOpsBeforeYield`

`MaxOpsBeforeYield` is a `Context.Reference<number>` with a default of `2048`.
It tunes the operation budget used for cooperative scheduler fairness.

A lower value means the runtime reaches the yield threshold sooner; a larger
value lets a runnable fiber do more work between scheduler checks.

### `PreventSchedulerYield`

`PreventSchedulerYield` defaults to `false`.

When it is `true`, the fiber run loop bypasses the scheduler yield check rather
than merely changing the threshold.

That distinction matters:

```text
MaxOpsBeforeYield = tuning
PreventSchedulerYield = bypass the check
```

Disabling automatic scheduler yields can allow a busy fiber to monopolize the
JavaScript thread, so it is a specialized runtime control rather than a normal
performance switch.

## Scheduler vs Schedule

These similarly named modules solve different problems:

```text
Schedule
    recurrence / repeat / retry / timing policy

Scheduler
    runnable callback dispatch / priority / fiber yielding
```

Use `Schedule.spaced(...)` to describe when an Effect repeats. Use the Scheduler
service only when runtime dispatch policy itself is the subject.

## Foldkit boundary

Scheduler objects should generally stay outside a pure Foldkit feature Model.

A useful boundary is:

```text
Effect runtime
    Scheduler service
    dispatcher / fiber machinery
    yield policy

runtime adapter / Command handler
    converts meaningful outcomes into Messages

Foldkit update
    pure Model transformation
```

The teaching demo therefore stores only stage and case names in its Foldkit
Model. No scheduler, dispatcher, or live runtime object is serialized through
feature state.

## Public surface coverage

The lesson covers all six current exports:

- `Scheduler` interface
- `Scheduler` reference
- `SchedulerDispatcher`
- `MixedScheduler`
- `MaxOpsBeforeYield`
- `PreventSchedulerYield`

## Type discipline

The generated demo contains no explicit `any` annotations.

The synthetic object used to demonstrate `shouldYield` is first treated as
`unknown` and then asserted to the method's actual fiber parameter type. This is
only a small runtime probe for the two fields read by `MixedScheduler`; normal
application code should use real runtime fibers rather than constructing them.

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

In the standalone artifact directory the actual workspace packages are not
resolved, so this check is intended to catch local syntax and implicit-any
problems rather than replace the monorepo's full typecheck.

## Integration expectation

If this demo is later integrated, follow the same child-feature pattern as the
neighboring `learn/*` demos:

1. add the child Model to the parent learn Model,
2. add `SchedulerDemo.Message` to the parent Message union,
3. initialize `SchedulerDemo.init`,
4. delegate child messages to `SchedulerDemo.update`,
5. render `SchedulerDemo.view(...)` from the Scheduler route.

This artifact performs none of those edits.
