# ExecutionPlan

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/ExecutionPlan

The current API page is Effect `4.0.0-rc.115`. It documents 14 page entries
when the `make` namespace and both TypeId value/type entries are counted.

The implementation was checked against both:

- `packages/effect/src/ExecutionPlan.ts`
- `packages/effect/src/internal/executionPlan.ts`

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`.

## Files

- `execution-plan.ts` — real plans, real `Effect.withExecutionPlan` runs,
  snapshots, Foldkit Model / Message / update.
- `execution-plan.view.ts` — interactive visual demo.
- `execution-plan-preview.png` — static preview of the default Steps stage.

## Intended location

```text
packages/features/src/learn/execution-plan/
├── execution-plan.ts
└── execution-plan.view.ts
```

No parent router/model/message/update files are modified.

## Teaching stages

### 1. Steps

Builds a real plan:

```ts
ExecutionPlan.make(
    {
        provide: primaryContext,
        attempts: 2
    },
    {
        provide: backupContext,
        attempts: 1
    }
)
```

Each step can contain:

- `provide` — Context or Layer
- `attempts`
- `while`
- `schedule`

The visual shows the ordered step list and checks:

```ts
ExecutionPlan.isExecutionPlan(plan)
```

plus the runtime `TypeId`.

`attempts` must be greater than zero.

A step with no retry policy receives one ordinary attempt before execution
advances to the next step.

### 2. Run

One workflow requires a `Backend` service and reads:

```ts
yield* ExecutionPlan.CurrentMetadata
```

The workflow itself does not know which concrete backend will be installed.

Three modes show:

- primary succeeds immediately
- primary fails twice, backup succeeds
- every step fails and the plan is exhausted

The real runtime semantics are important:

```text
attempt     cumulative across all steps
stepIndex   zero-based active step
stepAttempt one-based attempt within that step
```

`stepAttempt` is part of lifecycle events; `CurrentMetadata` exposes cumulative
`attempt` and `stepIndex`.

### 3. Events

Runs:

```ts
Effect.withExecutionPlan(
    workflow,
    plan,
    { onEvent }
)
```

The stable event trace is:

```text
AttemptStart   attempt 1 · step 0 · stepTry 1
AttemptFailure attempt 1 · step 0 · stepTry 1

AttemptStart   attempt 2 · step 0 · stepTry 2
AttemptFailure attempt 2 · step 0 · stepTry 2

AttemptStart   attempt 3 · step 1 · stepTry 1
AttemptSuccess attempt 3 · step 1 · stepTry 1
```

Every `AttemptStart` is followed by exactly one terminal event.

`AttemptFailure` contains the full `Cause`, including defects and interruptions.

Success / failure events also carry elapsed `Duration`. The UI intentionally
does not render those timings because they depend on the runtime clock and would
make the preview nondeterministic.

Outside a running plan:

```text
CurrentMetadata = { attempt: 0, stepIndex: 0 }
```

### 4. Merge

First, two separately defined two-step plans are combined:

```ts
ExecutionPlan.merge(
    firstPlan,
    secondPlan
)
```

The merged plan is a simple ordered concatenation:

```text
primary
secondary
backup
rescue
```

No interleaving or deduplication occurs.

The second half demonstrates `captureRequirements`.

A plan has a `while` predicate that requires a `RetryGate` service:

```ts
while: (_error: string) =>
    Effect.map(
        RetryGate,
        (gate) => gate.allow
    )
```

Then:

```ts
const captured =
    yield* gatedPlan
        .captureRequirements
        .pipe(
            Effect.provideService(
                RetryGate,
                { allow: true }
            )
        )
```

The captured plan can later run without providing `RetryGate`.

`captureRequirements` does not execute the plan. It closes over the current
Context and rewrites requirement-bearing Layers / predicates so the returned
plan has `requirements: never`.

## Current public surface

### Combining

- `merge`

### Constructors

- `make`

### Guards

- `isExecutionPlan`

### Metadata

- `Metadata`

### Models

- `AttemptFailure`
- `AttemptStart`
- `AttemptSuccess`
- `ConfigBase`
- `Event`
- `ExecutionPlan`

### Namespace / type helpers

- `make`
- `make.Step`
- `make.StepProvides`
- `make.PlanProvides`
- `make.StepInput`
- `make.PlanInput`

### Services

- `CurrentMetadata`

### Type IDs

- `TypeId` value
- `TypeId` type

## `Effect.withExecutionPlan`

The plan is consumed by `Effect.withExecutionPlan` rather than by a method on
the plan itself.

At runtime:

1. the active step's Context / Layer is provided,
2. metadata is incremented,
3. the workflow runs,
4. retry controls decide whether the same step runs again,
5. the runtime moves to the next step after that step is exhausted,
6. the first successful attempt ends the plan.

`while` and `schedule` consume the previous failure as their input.

## Type discipline

The generated demo has no explicit `any` annotations.

Message-match payload parameters use named payload types, avoiding contextual
typing leaks under `noImplicitAny`.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/learn/*` demos:

1. add the child Model to the parent learn Model,
2. add `ExecutionPlanDemo.Message` to the parent Message union,
3. initialize `ExecutionPlanDemo.init`,
4. delegate child messages to `ExecutionPlanDemo.update`,
5. render `ExecutionPlanDemo.view(...)` from the ExecutionPlan route.

This artifact intentionally performs none of those edits.
