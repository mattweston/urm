import { Effect, Option, Schema as S, Sink, Stream } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL STREAM PROGRAMS
// -----------------------------------------------------------------------------

export const create_program = Effect.gen(function* () {
    const iterableValues = yield* Stream.fromIterable([1, 2, 3, 4], {
        chunkSize: 2,
    }).pipe(Stream.runCollect)

    const effectValues = yield* Stream.fromEffect(
        Effect.succeed("ready" as const)
    ).pipe(Stream.runCollect)

    return {
        iterableValues,
        effectValues,
    } as const
})

export const transform_program = Effect.gen(function* () {
    const transformed = yield* Stream.fromArray([1, 2, 3, 4]).pipe(
        Stream.map((n: number, index: number) => n + index),
        Stream.filter((n: number) => n % 2 === 0),
        Stream.flatMap((n: number) => Stream.make(n, n * 10)),
        Stream.runCollect
    )

    const effectful = yield* Stream.make(1, 2, 3).pipe(
        Stream.mapEffect((n: number) => Effect.succeed(n * 3)),
        Stream.runCollect
    )

    return {
        transformed,
        effectful,
    } as const
})

export const control_program = Effect.gen(function* () {
    const bounded = yield* Stream.make(1, 2, 3, 4, 5).pipe(
        Stream.take(4),
        Stream.buffer({ capacity: 2, strategy: "suspend" }),
        Stream.runCollect
    )

    const merged = yield* Stream.merge(
        Stream.make("left-1", "left-2"),
        Stream.make("right-1", "right-2")
    ).pipe(Stream.runCollect)

    return {
        bounded,
        merged,
    } as const
})

export const run_program = Effect.gen(function* () {
    const collected = yield* Stream.runCollect(Stream.make(1, 2, 3))
    const total = yield* Stream.run(Stream.make(1, 2, 3), Sink.sum)
    const first = yield* Stream.runHead(Stream.make("a", "b", "c"))

    return {
        collected,
        total,
        first: Option.getOrUndefined(first),
    } as const
})

export const async_iterable_example = Stream.toAsyncIterable(
    Stream.make("alpha", "beta", "gamma")
)

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Create"),
    S.Literal("Transform"),
    S.Literal("Control"),
    S.Literal("Run"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Create",
    "Transform",
    "Control",
    "Run",
]

export const CreateCase = S.Union([
    S.Literal("Iterable"),
    S.Literal("Effect"),
    S.Literal("AsyncIterable"),
    S.Literal("Queue"),
])
export type CreateCase = typeof CreateCase.Type

export const create_cases: ReadonlyArray<CreateCase> = [
    "Iterable",
    "Effect",
    "AsyncIterable",
    "Queue",
]

export const TransformCase = S.Union([
    S.Literal("Map"),
    S.Literal("MapEffect"),
    S.Literal("Filter"),
    S.Literal("FlatMap"),
])
export type TransformCase = typeof TransformCase.Type

export const transform_cases: ReadonlyArray<TransformCase> = [
    "Map",
    "MapEffect",
    "Filter",
    "FlatMap",
]

export const ControlCase = S.Union([
    S.Literal("Take"),
    S.Literal("Buffer"),
    S.Literal("Merge"),
    S.Literal("Timing"),
])
export type ControlCase = typeof ControlCase.Type

export const control_cases: ReadonlyArray<ControlCase> = [
    "Take",
    "Buffer",
    "Merge",
    "Timing",
]

export const RunCase = S.Union([
    S.Literal("Collect"),
    S.Literal("Sink"),
    S.Literal("AsyncIterable"),
    S.Literal("Queue"),
])
export type RunCase = typeof RunCase.Type

export const run_cases: ReadonlyArray<RunCase> = [
    "Collect",
    "Sink",
    "AsyncIterable",
    "Queue",
]

export const Model = S.Struct({
    stage: Stage,
    createCase: CreateCase,
    transformCase: TransformCase,
    controlCase: ControlCase,
    runCase: RunCase,
})
export type Model = typeof Model.Type

export type StageDetails = Readonly<{
    eyebrow: string
    title: string
    description: string
    code: string
    apis: ReadonlyArray<string>
    notice: string
}>

export const stage_details: Record<Stage, StageDetails> = {
    Create: {
        eyebrow:
            "Stream<A, E, R> describes an effectful source that is pulled by a consumer",
        title: "Build the source that matches the boundary you actually have",
        description:
            "Streams can come from ordinary values, Effects, iterables, async iterables, queues, pubsubs, schedules, callbacks, and lower-level pull/channel sources. The source description does not execute until a destructor consumes it.",
        code: `const numbers = Stream.fromIterable(
    [1, 2, 3, 4],
    { chunkSize: 2 }
)

const values = yield* Stream.runCollect(
    numbers
)`,
        apis: [
            "Stream.Stream",
            "Stream.fromIterable",
            "Stream.fromEffect",
            "Stream.fromAsyncIterable",
            "Stream.fromQueue",
        ],
        notice: "Stream is pull-based and chunked. Pure/effect constructors are descriptions that run when consumed, while queue/pubsub sources wrap shared external state whose lifecycle and backpressure rules still matter.",
    },

    Transform: {
        eyebrow:
            "transform one value, run Effects per value, or expand each value into another Stream",
        title: "Keep one-to-one transforms distinct from sequencing",
        description:
            "map is pure and one-to-one. mapEffect preserves one output per input while allowing failure/services. filter can discard values. flatMap maps each value to another Stream; sequential is the default, while higher concurrency merges inner outputs as they arrive.",
        code: `const out = Stream.make(1, 2, 3).pipe(
    Stream.map((n, i) => n + i),
    Stream.filter((n) => n % 2 === 0),
    Stream.flatMap((n) =>
        Stream.make(n, n * 10)
    ),
    Stream.runCollect
)`,
        apis: [
            "Stream.map",
            "Stream.mapEffect",
            "Stream.filter",
            "Stream.flatMap",
            "Stream.switchMap",
        ],
        notice: "flatMap is a sequencing boundary, not just a mapper. With default concurrency, inner streams are concatenated in input order; with concurrent flatMap they run together and outputs are merged as they arrive.",
    },

    Control: {
        eyebrow:
            "shape demand, buffering, timing, and multi-source coordination before the terminal run",
        title: "Control how production and consumption are coupled",
        description:
            "take/drop bound the logical stream, buffer adds a queue between producer and consumer, merge combines sources concurrently, and timing operators such as debounce, throttle, schedule, timeout, interruptWhen, and haltWhen control when pulls are allowed to continue.",
        code: `const bounded = Stream.make(
    1, 2, 3, 4, 5
).pipe(
    Stream.take(4),
    Stream.buffer({
        capacity: 2,
        strategy: "suspend"
    })
)`,
        apis: [
            "Stream.take",
            "Stream.buffer",
            "Stream.merge",
            "Stream.debounce",
            "Stream.timeout",
        ],
        notice: 'A finite buffer with strategy "suspend" preserves backpressure. "dropping" and "sliding" can discard values when full. Stream.buffer also destroys chunking; use bufferArray or rechunk when chunk boundaries matter.',
    },

    Run: {
        eyebrow:
            "a Stream remains a description until a destructor drives its pulls",
        title: "Choose the terminal boundary by the result shape you need",
        description:
            "runCollect materializes all elements, run delegates consumption to a Sink, runHead/runLast/runFold produce focused Effect results, and adapters such as toAsyncIterable/toReadableStream/toQueue bridge Stream into external consumption protocols.",
        code: `const collected = yield* Stream.runCollect(
    Stream.make(1, 2, 3)
)

const total = yield* Stream.run(
    Stream.make(1, 2, 3),
    Sink.sum
)`,
        apis: [
            "Stream.runCollect",
            "Stream.run",
            "Stream.runHead",
            "Stream.toAsyncIterable",
            "Stream.toQueue",
        ],
        notice: "Destructors execute the stream. runCollect waits for upstream completion and keeps all emitted values in memory, so it is a finite-stream boundary rather than a default choice for unbounded or very large sources.",
    },
}

// -----------------------------------------------------------------------------
// VISUAL SNAPSHOTS
// -----------------------------------------------------------------------------

export type Snapshot = Readonly<{
    input: string
    operation: string
    result: string
    invariant: string
    implementation: string
    guidance: string
}>

export const create_snapshot = (model: Model): Snapshot => {
    switch (model.createCase) {
        case "Iterable":
            return {
                input: "[1, 2, 3, 4] · chunkSize 2",
                operation: "Stream.fromIterable(values, options)",
                result: "Stream<number> → [1, 2, 3, 4] when run",
                invariant: "the iterable is emitted through non-empty chunks",
                implementation:
                    "chunkSize is a maximum chunk size; live rc.117 normalizes it to at least 1",
                guidance:
                    "Use fromIterable/fromArray for finite in-memory sources; chunk size is a throughput detail, not part of the element API.",
            }

        case "Effect":
            return {
                input: "Effect<A, E, R>",
                operation: "Stream.fromEffect(effect)",
                result: "one A · same E and R",
                invariant: "the effect runs when the stream is consumed",
                implementation:
                    "the single result is lifted into a one-element chunk",
                guidance:
                    "Use fromEffect for one effectful value; use fromEffectRepeat or schedules when the effect should produce repeatedly.",
            }

        case "AsyncIterable":
            return {
                input: "AsyncIterable<A> + onError",
                operation: "Stream.fromAsyncIterable(iterable, onError)",
                result: "Stream<A, E>",
                invariant: "iterator failures are mapped through onError",
                implementation:
                    "pulling follows the AsyncIterator protocol and ends when it reports done",
                guidance:
                    "Use this at JavaScript interop boundaries; keep the error mapper explicit so foreign exceptions enter a typed stream error channel.",
            }

        case "Queue":
            return {
                input: "Queue.Dequeue<A, E>",
                operation: "Stream.fromQueue(queue)",
                result: "queued values become stream elements",
                invariant:
                    "Cause.Done ends the stream; other queue failures remain failures",
                implementation:
                    "the stream pulls non-empty batches from the dequeue",
                guidance:
                    "Queues are stateful producer/consumer boundaries; capacity and queue strategy determine backpressure before Stream sees the values.",
            }
    }
}

export const transform_snapshot = (model: Model): Snapshot => {
    switch (model.transformCase) {
        case "Map":
            return {
                input: "1, 2, 3",
                operation: "map((n, index) => n + index)",
                result: "1, 3, 5",
                invariant: "one output is produced for every input",
                implementation:
                    "the element index increases across emitted chunks",
                guidance:
                    "Use map for pure value conversion; keep effectful work in mapEffect so failure and services stay visible in the Stream type.",
            }

        case "MapEffect":
            return {
                input: "Stream<A, E, R> + A → Effect<B, E2, R2>",
                operation: "Stream.mapEffect(f)",
                result: "Stream<B, E | E2, R | R2>",
                invariant:
                    "every input still corresponds to one successful output",
                implementation:
                    "each mapped Effect participates in Stream failure and service channels",
                guidance:
                    "Use mapEffect for per-element I/O or validation when you still want one output per successful input.",
            }

        case "Filter":
            return {
                input: "1, 2, 3, 4",
                operation: "filter(n => n % 2 === 0)",
                result: "2, 4",
                invariant:
                    "filter changes cardinality but not the value type unless a refinement is used",
                implementation:
                    "values rejected by the predicate are simply not emitted",
                guidance:
                    "Use filterMap when selection and transformation belong in one operation; use refinement overloads when filtering should narrow the type.",
            }

        case "FlatMap":
            return {
                input: "1, 2, 3",
                operation: "flatMap(n => Stream.make(n, n * 10))",
                result: "1, 10, 2, 20, 3, 30 (sequential)",
                invariant: "default concurrency is sequential",
                implementation:
                    "concurrency > 1 runs inner streams together and merges output arrival order",
                guidance:
                    "Use flatMap when each element expands into a Stream. If you only need an Effect per item, mapEffect is simpler and communicates cardinality better.",
            }
    }
}

export const control_snapshot = (model: Model): Snapshot => {
    switch (model.controlCase) {
        case "Take":
            return {
                input: "1, 2, 3, 4, 5",
                operation: "Stream.take(3)",
                result: "1, 2, 3 then upstream is no longer needed",
                invariant: "the resulting stream emits at most n elements",
                implementation:
                    "rc.112 treats n < 1 as empty; live constructors increasingly normalize numeric counts",
                guidance:
                    "Bound infinite or expensive sources before collecting them. Put take early when downstream work should never see extra values.",
            }

        case "Buffer":
            return {
                input: "fast producer → slow consumer",
                operation: "buffer({ capacity: 2, strategy: 'suspend' })",
                result: "up to 2 elements decoupled between producer and consumer",
                invariant:
                    "suspend preserves backpressure; dropping/sliding may lose values",
                implementation:
                    "buffer queues elements and destroys upstream chunk boundaries",
                guidance:
                    "Choose a lossy strategy only when dropping is part of the domain contract. Use bufferArray if chunk boundaries themselves carry meaning.",
            }

        case "Merge":
            return {
                input: "left Stream + right Stream",
                operation: "Stream.merge(left, right)",
                result: "values from both sources as they become available",
                invariant:
                    "relative order across the two streams is concurrency-dependent",
                implementation:
                    "haltStrategy controls whether one or both sides must complete before the merge ends",
                guidance:
                    "Use zip when pairwise alignment matters; use merge when independent sources should share one output channel.",
            }

        case "Timing":
            return {
                input: "time-sensitive pull sequence",
                operation: "debounce / throttle / timeout / schedule",
                result: "timing policy becomes part of Stream execution",
                invariant:
                    "timing combinators change when values are emitted or when the stream ends/falls back",
                implementation:
                    "Clock/Schedule services remain explicit in the Effect environment where required",
                guidance:
                    "Keep timing policy close to the stream boundary it governs so retries, timeouts, and rate limits are not hidden inside unrelated mapping logic.",
            }
    }
}

export const run_snapshot = (model: Model): Snapshot => {
    switch (model.runCase) {
        case "Collect":
            return {
                input: "finite Stream<A, E, R>",
                operation: "Stream.runCollect(stream)",
                result: "Effect<Array<A>, E, R>",
                invariant:
                    "the entire stream must complete before the array is returned",
                implementation:
                    "each emitted chunk is appended into one mutable accumulator array",
                guidance:
                    "Use runCollect for bounded data. Prefer a Sink, folding destructor, queue, or incremental callback for large/unbounded streams.",
            }

        case "Sink":
            return {
                input: "Stream<number> + Sink.sum",
                operation: "Stream.run(stream, sink)",
                result: "Effect<number>",
                invariant: "the Sink owns the consumption/result protocol",
                implementation:
                    "Stream drives the sink transform with its pull source and scope",
                guidance:
                    "Use run with Sink when the terminal consumer has richer semantics than a simple collect/fold helper, especially early completion or leftovers.",
            }

        case "AsyncIterable":
            return {
                input: "service-free Stream<A, E>",
                operation: "Stream.toAsyncIterable(stream)",
                result: "AsyncIterable<A>",
                invariant: "the adapter owns a scope for the iterator lifetime",
                implementation:
                    "return()/throw() close the scope and interrupt an active pull when necessary",
                guidance:
                    "Use toAsyncIterableEffect/toAsyncIterableWith when stream services are required; service-free toAsyncIterable is the simplest JS interop boundary.",
            }

        case "Queue":
            return {
                input: "Stream<A, E, R> + queue options",
                operation: "Stream.toQueue({ capacity: 8 })",
                result: "Effect<Queue.Dequeue<A, E | Cause.Done>, never, R | Scope>",
                invariant:
                    "completion is encoded as Cause.Done and the queue is scope-owned",
                implementation:
                    "the stream runs concurrently and feeds elements into the dequeue",
                guidance:
                    "Use a queue when downstream consumption is independently scheduled. Keep the surrounding Scope alive for exactly as long as the bridge should exist.",
            }
    }
}

// -----------------------------------------------------------------------------
// MESSAGES + UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedStreamStage: {
        stage: Stage,
    },
    SelectedStreamCreateCase: {
        createCase: CreateCase,
    },
    SelectedStreamTransformCase: {
        transformCase: TransformCase,
    },
    SelectedStreamControlCase: {
        controlCase: ControlCase,
    },
    SelectedStreamRunCase: {
        runCase: RunCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Create",
    createCase: "Iterable",
    transformCase: "Map",
    controlCase: "Buffer",
    runCase: "Collect",
})

type StagePayload = Readonly<{ stage: Stage }>
type CreateCasePayload = Readonly<{ createCase: CreateCase }>
type TransformCasePayload = Readonly<{ transformCase: TransformCase }>
type ControlCasePayload = Readonly<{ controlCase: ControlCase }>
type RunCasePayload = Readonly<{ runCase: RunCase }>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedStreamStage: ({ stage }: StagePayload) => ({
            model: evo(model, { stage: () => stage }),
        }),

        SelectedStreamCreateCase: ({ createCase }: CreateCasePayload) => ({
            model: evo(model, { createCase: () => createCase }),
        }),

        SelectedStreamTransformCase: ({
            transformCase,
        }: TransformCasePayload) => ({
            model: evo(model, { transformCase: () => transformCase }),
        }),

        SelectedStreamControlCase: ({ controlCase }: ControlCasePayload) => ({
            model: evo(model, { controlCase: () => controlCase }),
        }),

        SelectedStreamRunCase: ({ runCase }: RunCasePayload) => ({
            model: evo(model, { runCase: () => runCase }),
        }),
    })
