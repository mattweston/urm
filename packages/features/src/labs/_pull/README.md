# Pull

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/Pull

The current Effect source package is `4.0.0-rc.116`.

The current `packages/effect/src/Pull.ts` source exposes **15 public exports**:

- `Pull`
- `Success`
- `Error`
- `Leftover`
- `Services`
- `ExcludeDone`
- `catchDone`
- `isDoneCause`
- `isDoneFailure`
- `filterDone`
- `filterDoneVoid`
- `filterNoDone`
- `filterDoneLeftover`
- `doneExitFromCause`
- `matchEffect`

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `pull.ts` — value / ordinary error / Done pull examples, type extractors,
  Done detection and filtering, recovery, Exit conversion, and three-way match.
- `pull.view.ts` — interactive visual demo.

## Intended location

```text
packages/features/src/labs/pull/
├── pull.ts
└── pull.view.ts
```

No parent router/model/message/update files are modified.

## Core idea

`Pull` is the low-level type for **one stream-like pull step**.

Its shape is:

```ts
interface Pull<
    A,
    E = never,
    Done = void,
    R = never
>
    extends Effect<
        A,
        E | Cause.Done<Done>,
        R
    >
{}
```

So evaluating one Pull can mean one of three semantic outcomes:

```text
success
    emit one A

ordinary failure
    fail with E

done
    normal end-of-input
    carrying Done
```

The important detail is that `Cause.Done` travels through the Effect error
channel, but Pull treats it as **graceful completion**, not an ordinary failure.

## Why model Done in the error channel?

A low-level pull needs to communicate:

```text
here is another value
or
the producer failed
or
the producer is finished
```

The ordinary Effect success channel already represents the first case.

Using `Cause.Done<Done>` in the typed error channel gives the implementation a
distinct terminal signal without conflating it with the value type.

Then Pull helpers can separate:

```text
E
from
Cause.Done<Done>
```

again.

This pattern is especially useful under Channel / Stream machinery where a
consumer repeatedly runs the same pull effect.

## 1. Model

### `Pull<A, E, Done, R>`

A successful pull:

```ts
const pull:
    Pull.Pull<
        number,
        string,
        string
    > =
    Effect.succeed(
        42
    )
```

means:

```text
emit 42
```

An ordinary failure:

```ts
const pull:
    Pull.Pull<
        number,
        string,
        string
    > =
    Effect.fail(
        "boom"
    )
```

means:

```text
stream/pull operation failed
```

A graceful completion:

```ts
const pull:
    Pull.Pull<
        number,
        string,
        string
    > =
    Cause.done(
        "end-of-input"
    )
```

means:

```text
no more values
completion leftover = "end-of-input"
```

## `Cause.Done`

The Done signal itself has:

```text
_tag:
    "Done"

value:
    A
```

and a dedicated runtime type marker.

`Cause.done(value)` creates an Effect that fails with that `Done` signal.

That sounds like failure at the raw Effect level, but Pull helpers interpret it
as normal completion.

## Why the Done payload is called leftover

Current Pull naming uses:

```text
Leftover
```

for the type carried by `Cause.Done`.

This is useful for low-level stream transforms that may finish while retaining a
final value or remainder to pass outward.

Examples include:

```text
final decoder state
unconsumed input
channel done value
flush state
```

depending on the surrounding abstraction.

## Type extractors

### `Success<P>`

Extracts the success/output type from a Pull-like Effect.

For:

```ts
Pull.Pull<
    number,
    string,
    string
>
```

the success type is:

```text
number
```

## `Error<P>`

Extracts ordinary failure while excluding Done.

For:

```text
string |
Cause.Done<string>
```

the Pull error extractor yields:

```text
string
```

This is useful in generic Channel/Pull helpers that need the true failure type.

## `Leftover<P>`

Extracts the Done payload type.

For:

```text
Cause.Done<string>
```

the leftover is:

```text
string
```

## `Services<P>`

Extracts the Effect environment / service requirements.

If:

```text
Pull<A, E, Done, R>
```

then:

```text
Services<P>
    = R
```

## `ExcludeDone<E>`

Removes all `Cause.Done<...>` members from an error union.

Conceptually:

```ts
type E =
    | string
    | Cause.Done<number>

type Ordinary =
    Pull.ExcludeDone<E>
// string
```

The current upstream implementation uses the normal TypeScript `Exclude`
utility against `Cause.Done`.

## 2. Detect

### `isDoneCause`

```ts
Pull.isDoneCause(
    cause
)
```

checks whether **any reason** inside a `Cause` is a Done failure.

The implementation is conceptually:

```text
cause.reasons.some(
    isDoneFailure
)
```

This is only a boolean detection helper.

It does not determine whether the same Cause also contains a real failure.

That distinction belongs to `filterDone`.

## `isDoneFailure`

This is the reason-level guard.

It accepts one:

```text
Cause.Reason<E>
```

and succeeds only when:

```text
reason._tag === "Fail"
and
Cause.isDone(reason.error)
```

This narrows the reason to a fail reason containing a Done signal.

## Cause versus Reason

Useful mental model:

```text
Cause
    collection / structure of reasons

Reason
    one Fail / Die / Interrupt entry
```

`isDoneCause` asks:

```text
does this Cause contain a Done?
```

`isDoneFailure` asks:

```text
is this individual reason specifically
a Fail(Done)?
```

## Detection does not equal clean completion

Suppose a Cause contains both:

```text
Done("finished")
and
real failure "finalizer boom"
```

Then:

```text
isDoneCause(cause)
    → true
```

but it would be wrong to call the whole operation successful.

That is why the filtering helpers preserve real failures.

## 3. Filter

### `filterDone`

Input:

```text
Cause<E>
```

Output:

```text
Result<
    Cause.Done.Only<E>,
    Cause<ExcludeDone<E>>
>
```

The behavior is more nuanced than “find Done”.

### Done only

If the Cause contains Done and no real failure other than interruptions:

```text
Result.Success(
    Done(value)
)
```

### No Done

If no Done is present:

```text
Result.Failure(
    original Cause
)
```

### Done plus a genuine failure

If Done exists **and** the Cause also contains a non-interruption failure:

```text
Result.Failure(
    Cause with Done reasons removed
)
```

The genuine failure survives.

This is an important invariant:

```text
normal completion never hides real failure
```

## Interruptions with Done

Current source treats interruption differently from ordinary failure while
deciding whether Done is clean.

A Cause containing:

```text
Done
+
Interrupt
```

can still be recognized as Done completion.

A Cause containing:

```text
Done
+
Fail(real error)
```

becomes the real failure after Done is stripped.

## `filterDoneVoid`

This is the variant for when the Done payload is not needed.

Its role is:

```text
detect / separate Done
without preserving a typed leftover value
```

It reuses the same filtering behavior.

## `filterDoneLeftover`

Instead of returning the `Done` object, this helper extracts:

```text
done.value
```

So:

```text
Done("tail")
```

becomes:

```text
Result.Success(
    "tail"
)
```

Real failures are still preserved exactly as with `filterDone`.

## `filterNoDone`

This is the inverse-oriented filter.

It succeeds only when there is no Done failure:

```text
Cause("boom")
    ↓
Success(
    Cause("boom")
)
```

If a Done exists:

```text
Failure(
    original Cause
)
```

This is useful when an error handler should run only for genuine non-Done
causes.

## Result as a filter protocol

The Pull filtering helpers use Effect's current `Result` type as the
success/failure selection mechanism.

Conceptually:

```text
Success
    selected branch matched

Failure
    branch did not match
    or a more important remaining Cause survives
```

This makes the helpers suitable for Effect/Cause filtering internals.

## 4. Match

### `catchDone`

```ts
Pull.catchDone(
    pull,
    (
        leftover
    ) =>
        Effect.succeed(
            transform(leftover)
        )
)
```

handles only the Done case.

Ordinary errors remain in the error channel.

The resulting error type excludes Done from the original error union and adds
the handler's own error type.

This is the Pull equivalent of:

```text
recover graceful completion
without catching real failure
```

## `matchEffect`

This is the clearest three-way destructor.

```ts
Pull.matchEffect(
    pull,
    {
        onSuccess,
        onFailure,
        onDone
    }
)
```

The branches are:

```text
onSuccess:
    A

onFailure:
    Cause<E>

onDone:
    Done leftover
```

All three handlers may return Effects.

Their success, error, and environment types are combined into the resulting
Effect type.

## Why onFailure receives `Cause<E>`

The ordinary failure branch receives a full:

```text
Cause<E>
```

rather than just `E`.

That preserves:

```text
multiple reasons
defects if represented in the Cause
interrupt context
parallel-composition cause structure
```

after Done has been separated away.

## Done mixed with real failure under `matchEffect`

Internally, `matchEffect` calls `filterDone`.

Therefore:

```text
Done only
    → onDone(leftover)

Done + real failure
    → onFailure(real Cause)

ordinary failure
    → onFailure(cause)
```

Again, graceful completion never masks a real failure.

## `doneExitFromCause`

This converts:

```text
Cause<E | Done<L>>
```

into:

```text
Exit<L, ExcludeDone<E>>
```

### Clean Done

A clean Done becomes:

```text
Exit.Success(
    leftover
)
```

### Real failure

A genuine remaining Cause becomes:

```text
Exit.Failure(
    cause
)
```

This is useful when a scope/finalizer needs an Exit and Pull completion should
count as successful completion.

## Current Channel integration

Current Effect `Channel` source uses:

```ts
Pull.doneExitFromCause(
    cause
)
```

when closing a forked scope around a transformed pull.

That ensures:

```text
Done
    closes scope as success

real failure
    closes scope as failure
```

Current Channel transformation code also uses:

```ts
Pull.matchEffect(
    upstream,
    {
        onSuccess,
        onFailure,
        onDone
    }
)
```

for operations that may need to flush buffered output before forwarding final
Done.

For example, line splitting can:

```text
receive upstream Done
flush a final partial line if present
then re-emit Cause.done(leftover)
```

That is exactly the kind of low-level logic this module is designed for.

## Pull versus Effect

Every Pull is an Effect.

But the interpretation of its error channel is specialized.

### Effect

```text
success
failure
```

### Pull

```text
success value
ordinary failure
graceful Done completion
```

So Pull should be thought of as:

```text
Effect
+
a convention / type discipline
for one low-level stream step
```

## Pull versus Take

Effect also has `Take`, another stream-adjacent low-level representation.

A useful conceptual distinction:

```text
Pull
    executable Effect step

Take
    data representation of an output / failure / Done state
```

Current `Take.toPull` converts a Take into Pull semantics.

A successful Take element becomes a successful Effect.

A successful Take Done value becomes:

```ts
Cause.done(
    doneValue
)
```

This reinforces that Done is the normal terminal representation in Pull.

## Pull versus Channel

Pull is one low-level step.

Channel describes a reusable stream transformation.

Conceptually:

```text
Channel transform
    receives upstream Pull
    returns downstream Pull
```

Current Channel source signatures use:

```ts
Pull.Pull<
    InElem,
    InErr,
    InDone
>
```

and return transformed Pulls.

So Pull is a core execution primitive underneath Channel logic rather than an
end-user collection API.

## When to use Pull directly

Use Pull when implementing low-level stream / Channel internals that need to
distinguish:

```text
value
failure
completion
```

one evaluation at a time.

Most application code should prefer higher-level abstractions such as:

```text
Stream
Channel
Sink
Queue
```

unless it is implementing the machinery beneath them.

## Type extractor summary

For:

```ts
type P =
    Pull.Pull<
        A,
        E,
        Done,
        R
    >
```

the module provides:

```text
Pull.Success<P>
    A

Pull.Error<P>
    E

Pull.Leftover<P>
    Done

Pull.Services<P>
    R
```

and:

```text
Pull.ExcludeDone<
    E | Cause.Done<Done>
>
    E
```

These are all type-only utilities.

## Current public surface

### Model

- `Pull`

### Type extractors

- `Success`
- `Error`
- `Leftover`
- `Services`
- `ExcludeDone`

### Done recovery / detection

- `catchDone`
- `isDoneCause`
- `isDoneFailure`

### Cause filters

- `filterDone`
- `filterDoneVoid`
- `filterNoDone`
- `filterDoneLeftover`

### Conversion / matching

- `doneExitFromCause`
- `matchEffect`

That accounts for all **15** current public exports.

## Foldkit integration

Pull is significantly lower-level than the usual Foldkit feature boundary.

Do not put Pull objects in the pure UI Model just to transport stream state.

A better architecture is:

```text
Effect / Channel runtime
    repeatedly evaluates Pull

Pull.matchEffect
    distinguishes value / failure / Done

runtime adapter
    converts meaningful outcomes
    into Foldkit Messages

Foldkit update
    remains pure
```

This keeps stream execution and scope/failure mechanics outside the pure
Model/view layer.

## Foldkit Runtime boundary

This follows the same rule as the extra Foldkit Runtime documentation:

```text
main.ts
    Model
    Message
    init
    update
    view
    pure

entry / runtime integration
    Channel
    Stream
    Pull
    side effects
```

Pull is implementation machinery for effectful stream processing, so it belongs
on the runtime side of that boundary.

## Type discipline

The generated demo has no explicit `any` annotations.

Every custom handler, Foldkit Message payload, and UI callback that could lose
contextual typing has an explicit type where appropriate.

Button attributes are derived from `HtmlBuilder`.

The upstream current Pull implementation itself contains several internal
`any` casts in generic filtering plumbing. That is separate from the generated
artifact constraint.

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

In this environment the actual `effect`, `foldkit`, and UI packages are not
resolved, so this check catches local syntax and implicit-any problems rather
than replacing a full typecheck inside the target monorepo.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/labs/*` demos:

1. add the child Model to the parent learn Model,
2. add `PullDemo.Message` to the parent Message union,
3. initialize `PullDemo.init`,
4. delegate child messages to `PullDemo.update`,
5. render `PullDemo.view(...)` from the Pull route.

This artifact intentionally performs none of those edits.
