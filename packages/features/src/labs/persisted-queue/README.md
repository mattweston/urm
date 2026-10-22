# Foldkit PersistedQueue animation demos

A Foldkit `0.148.x` port of the four interactive diagrams in Effect's **Module of the Week — PersistedQueue** article:

1. Upload → Queue → Worker
2. Multiple producers and consumers
3. Lock acquisition / refresh / expiry / reclaim
4. Failure → five-second retry delay → attempt 2

The code is intentionally a **visual simulation**, not a real `PersistedQueue` client. Its state machine mirrors the concepts from the article while keeping the browser demo deterministic and replayable.

## Files

- `persisted-queue.ts` — Model, Message, update, Subscription clock, and derived animation frames.
- `persisted-queue.view.ts` — Foldkit HTML view for all four demos.
- `styles.css` — the motion/layout styling.
- `index.ts` — exports.

## Target versions

This folder follows the conventions currently used by `mattweston/urm`:

- `foldkit`: `0.148.2`
- `@foldkit/ui`: `0.148.2`
- `effect`: `4.0.0-rc.112`

In particular, `update` returns Foldkit's tuple-shaped `Update.Return`, and the clock uses `Subscription.make` in the same style as the existing timer/dice examples.

## Suggested location

Copy this directory to something like:

```text
packages/features/src/learn/foldkit/examples/persisted-queue/
```

Then import its stylesheet once in the page/feature that renders it:

```ts
import "./examples/persisted-queue/styles.css"
```

## Parent Model

```ts
import * as PersistedQueue from "./examples/persisted-queue/index.ts"

export const Model = S.Struct({
    // ...existing fields
    persisted_queue: PersistedQueue.Model,
})
```

Initialize it with:

```ts
persisted_queue: PersistedQueue.init,
```

## Parent Message

```ts
import * as PersistedQueue from "./examples/persisted-queue/index.ts"

export const Message = S.Union([
    // ...existing messages
    PersistedQueue.Message,
])
```

## Parent update

Following the same dispatch approach already used by `learn/foldkit/update.ts`:

```ts
const is_persisted_queue_message = S.is(PersistedQueue.Message)

// before the final route-only Match:
if (is_persisted_queue_message(message)) {
    const [persisted_queue, commands] = PersistedQueue.update(
        model.persisted_queue,
        message
    )
    return [
        evo(model, { persisted_queue: () => persisted_queue }),
        commands,
    ]
}
```

## Parent subscriptions

Lift the demo's single ticking subscription into the parent:

```ts
Subscription.lift(PersistedQueue.subscriptions)<Model, Message>({
    toChildModel: (model) => model.persisted_queue,
    toParentMessage: (message) => message,
})
```

Add that to the existing `Subscription.aggregate(...)` call.

## Render

The view accepts a message mapper so it can render inside a parent Foldkit program without knowing the parent Message type:

```ts
PersistedQueue.view(
    model.persisted_queue,
    (message) => message,
    h
)
```

If your parent wraps child messages rather than unioning them directly, replace `(message) => message` with that wrapper.

## Why a Subscription clock?

The original Effect article demos are timeline visualizations. Here the timeline is represented in the Foldkit Model and advanced by a scoped `Subscription` only while at least one demo is playing. The derived `*_frame` functions turn elapsed time into semantic queue state; CSS transitions interpolate the visual movement.

That keeps:

- Play/Restart deterministic.
- lock and retry countdowns visible in the Model flow.
- animation state inspectable in Foldkit DevTools.
- browser lifecycle work scoped to the period where animation is actually active.

## Source behavior mirrored

The lock demo shows worker 1 taking a lock, refreshing it twice, going offline, the lock expiring, and worker 2 claiming the job on a later poll.

The retry demo models the article's five-second retry delay: attempt 1 fails, the lock is released, the job is unavailable during the delay, then worker 2 claims attempt 2 and completes it.
