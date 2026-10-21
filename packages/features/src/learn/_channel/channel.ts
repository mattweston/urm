import { Channel, Effect, Option, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 Channel examples
// -----------------------------------------------------------------------------

// A finite source channel.
export const numbers = Channel.fromArray([1, 2, 3, 4, 5])

// Pure transforms.
export const doubled = Channel.map(numbers, (n, index) => n * 2 + index)

export const evens = Channel.filter(numbers, (n) => n % 2 === 0)

// Effectful transform. Sequential by default.
export const squaredEffectfully = Channel.mapEffect(numbers, (n) =>
    Effect.succeed(n * n)
)

// Concurrency is opt-in.
export const squaredConcurrently = Channel.mapEffect(
    numbers,
    (n) => Effect.succeed(n * n),
    {
        concurrency: "unbounded",
        unordered: true,
    }
)

// Concatenate complete channels.
export const concatenated = Channel.concat(
    Channel.fromArray([1, 2, 3]),
    Channel.fromArray([4, 5])
)

// Expand each output element into another Channel.
export const expanded = Channel.flatMap(Channel.fromArray([1, 2, 3]), (n) =>
    Channel.fromArray(
        Array.from(
            {
                length: n,
            },
            (_, index) => `${n}:${index}`
        )
    )
)

// A true transform channel: it accepts numbers from upstream and forwards
// transformed values downstream.
export const timesTenTransform = Channel.map(
    Channel.identity<number, never, void>(),
    (n) => n * 10
)

export const piped = Channel.pipeTo(
    Channel.fromArray([1, 2, 3]),
    timesTenTransform
)

// Channels have a completion value distinct from emitted elements.
export const sourceWithDone = Channel.fromIterator(() => {
    let current = 1

    return {
        next(): IteratorResult<number, string> {
            if (current <= 3) {
                return {
                    value: current++,
                    done: false,
                }
            }

            return {
                value: "finished",
                done: true,
            }
        },
    }
})

export const mappedDone = Channel.mapDone(
    sourceWithDone,
    (done) => `done:${done}`
)

// Runners convert Channel back into Effect.
export const collectEffect = Channel.runCollect(piped)

export const foldEffect = Channel.runFold(
    numbers,
    () => 0,
    (sum, n) => sum + n
)

export const headEffect = Channel.runHead(numbers)

export const lastEffect = Channel.runLast(numbers)

// Error channels remain typed and recoverable.
export const recovered = Channel.catchCause(Channel.fail("network"), () =>
    Channel.succeed("recovered")
)

// Resource lifecycle belongs to the Channel scope.
export const resourceChannel = Channel.acquireUseRelease(
    Effect.succeed("resource"),
    (resource) => Channel.succeed(resource.toUpperCase()),
    () => Effect.void
)

// -----------------------------------------------------------------------------
// Teaching demo
// -----------------------------------------------------------------------------

export const Stage = S.Literals(["Source", "Transform", "Compose", "Run"])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Source",
    "Transform",
    "Compose",
    "Run",
]

export const SourceMode = S.Literals(["Array", "Succeed", "Done", "Fail"])
export type SourceMode = typeof SourceMode.Type

export const TransformMode = S.Literals([
    "Map",
    "Filter",
    "MapEffect",
    "Concurrent",
])
export type TransformMode = typeof TransformMode.Type

export const ComposeMode = S.Literals([
    "Concat",
    "FlatMap",
    "PipeTo",
    "MapDone",
])
export type ComposeMode = typeof ComposeMode.Type

export const RunMode = S.Literals([
    "Collect",
    "Fold",
    "Head",
    "Last",
    "Recover",
])
export type RunMode = typeof RunMode.Type

export const Model = S.Struct({
    stage: Stage,
    sourceMode: SourceMode,
    transformMode: TransformMode,
    composeMode: ComposeMode,
    runMode: RunMode,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
    SelectedChannelStage: {
        stage: Stage,
    },
    SelectedChannelSourceMode: {
        sourceMode: SourceMode,
    },
    SelectedChannelTransformMode: {
        transformMode: TransformMode,
    },
    SelectedChannelComposeMode: {
        composeMode: ComposeMode,
    },
    SelectedChannelRunMode: {
        runMode: RunMode,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Source",
    sourceMode: "Array",
    transformMode: "Map",
    composeMode: "PipeTo",
    runMode: "Collect",
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
    Message.match<UpdateReturn>(message, {
        SelectedChannelStage: ({ stage }) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedChannelSourceMode: ({ sourceMode }) => ({
            model: evo(model, {
                sourceMode: () => sourceMode,
            }),
        }),

        SelectedChannelTransformMode: ({ transformMode }) => ({
            model: evo(model, {
                transformMode: () => transformMode,
            }),
        }),

        SelectedChannelComposeMode: ({ composeMode }) => ({
            model: evo(model, {
                composeMode: () => composeMode,
            }),
        }),

        SelectedChannelRunMode: ({ runMode }) => ({
            model: evo(model, {
                runMode: () => runMode,
            }),
        }),
    })

// -----------------------------------------------------------------------------
// Pure visual helpers
// -----------------------------------------------------------------------------

export const sourceResult = (
    mode: SourceMode
): Readonly<{
    expression: string
    emitted: ReadonlyArray<string>
    done: string
    error: string
    detail: string
}> => {
    switch (mode) {
        case "Array":
            return {
                expression: "Channel.fromArray([1,2,3,4,5])",
                emitted: ["1", "2", "3", "4", "5"],
                done: "void",
                error: "never",
                detail: "fromArray is a finite source Channel: it emits each array element and then completes.",
            }

        case "Succeed":
            return {
                expression: 'Channel.succeed("hello")',
                emitted: ['"hello"'],
                done: "void",
                error: "never",
                detail: "succeed emits one element. It is different from end, which emits nothing and completes with a done value.",
            }

        case "Done":
            return {
                expression: 'Channel.end("finished")',
                emitted: [],
                done: '"finished"',
                error: "never",
                detail: "Channel has two output concepts: emitted elements and a terminal OutDone value. `end` produces only the latter.",
            }

        case "Fail":
            return {
                expression: 'Channel.fail("network")',
                emitted: [],
                done: "never",
                error: '"network"',
                detail: "A failing Channel carries a typed OutErr just like Effect carries a typed error channel.",
            }
    }
}

const source = [1, 2, 3, 4, 5] as const

export const transformResult = (
    mode: TransformMode
): Readonly<{
    expression: string
    input: ReadonlyArray<number>
    output: ReadonlyArray<number>
    execution: string
    detail: string
}> => {
    switch (mode) {
        case "Map":
            return {
                expression: "Channel.map(source, (n, i) => n * 2 + i)",
                input: source,
                output: source.map((n, index) => n * 2 + index),
                execution: "pure · ordered",
                detail: "map transforms output elements and preserves the Channel's error, done, input, and environment types.",
            }

        case "Filter":
            return {
                expression: "Channel.filter(source, n => n % 2 === 0)",
                input: source,
                output: source.filter((n) => n % 2 === 0),
                execution: "pure · ordered",
                detail: "filter keeps accepted output elements; refinements can narrow the output element type.",
            }

        case "MapEffect":
            return {
                expression:
                    "Channel.mapEffect(source, n => Effect.succeed(n*n))",
                input: source,
                output: source.map((n) => n * n),
                execution: "effectful · sequential default",
                detail: "mapEffect adds the mapping Effect's error/services to the Channel. Without concurrency options, element effects run sequentially.",
            }

        case "Concurrent":
            return {
                expression:
                    'mapEffect(..., { concurrency: "unbounded", unordered: true })',
                input: source,
                output: source.map((n) => n * n),
                execution: "effectful · concurrent · unordered",
                detail: "Concurrency is explicit. `unordered: true` allows mapped results to emit as soon as each effect completes rather than preserving input order.",
            }
    }
}

export const composeResult = (
    mode: ComposeMode
): Readonly<{
    expression: string
    left: ReadonlyArray<string>
    right: ReadonlyArray<string>
    output: ReadonlyArray<string>
    detail: string
}> => {
    switch (mode) {
        case "Concat":
            return {
                expression: "Channel.concat([1,2,3], [4,5])",
                left: ["1", "2", "3"],
                right: ["4", "5"],
                output: ["1", "2", "3", "4", "5"],
                detail: "concat runs the left Channel to completion, then the right Channel. The resulting OutDone is the second Channel's done value.",
            }

        case "FlatMap":
            return {
                expression:
                    "Channel.flatMap([1,2,3], n => Channel.fromArray(n items))",
                left: ["1", "2", "3"],
                right: ["n → Channel"],
                output: ["1:0", "2:0", "2:1", "3:0", "3:1", "3:2"],
                detail: "flatMap turns each emitted element into another Channel and flattens those outputs; concurrency is optional.",
            }

        case "PipeTo":
            return {
                expression:
                    "Channel.pipeTo(source, Channel.map(Channel.identity(), n => n*10))",
                left: ["1", "2", "3"],
                right: ["InElem:number", "× 10", "OutElem:number"],
                output: ["10", "20", "30"],
                detail: "pipeTo is the Channel-specific composition primitive: the left output/error/done protocol becomes the right input/error/done protocol.",
            }

        case "MapDone":
            return {
                expression:
                    "Channel.mapDone(sourceWithDone, done => `done:${done}`)",
                left: ["1", "2", "3"],
                right: ['OutDone "finished"'],
                output: ["elements unchanged", 'OutDone "done:finished"'],
                detail: "mapDone transforms only the terminal completion value. It does not map emitted elements.",
            }
    }
}

export const runResult = (
    mode: RunMode
): Readonly<{
    expression: string
    result: string
    detail: string
}> => {
    switch (mode) {
        case "Collect":
            return {
                expression: "Channel.runCollect(piped)",
                result: "Effect<Array<number>> → [10,20,30]",
                detail: "runCollect consumes the Channel to completion and collects emitted elements into an Array.",
            }

        case "Fold":
            return {
                expression:
                    "Channel.runFold(numbers, () => 0, (sum,n) => sum+n)",
                result: "Effect<number> → 15",
                detail: "runFold consumes outputs incrementally without first materializing the full collection.",
            }

        case "Head":
            return {
                expression: "Channel.runHead(numbers)",
                result: "Effect<Option<number>> → Some(1)",
                detail: "runHead stops after the first output and represents no output with Option.none().",
            }

        case "Last":
            return {
                expression: "Channel.runLast(numbers)",
                result: "Effect<Option<number>> → Some(5)",
                detail: "runLast consumes the Channel and retains only its last emitted element.",
            }

        case "Recover":
            return {
                expression:
                    'Channel.catchCause(Channel.fail("network"), () => Channel.succeed("recovered"))',
                result: 'runCollect → ["recovered"]',
                detail: "Channel error handling can inspect the full Cause, recover tagged/filtered errors, retry with Schedule, or preserve defects/interruption separately.",
            }
    }
}
