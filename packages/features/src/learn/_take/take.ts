import { Effect, Exit, Pull, Schema as S, Take } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL TAKE PROGRAMS
// -----------------------------------------------------------------------------

export type DemoTake = Take.Take<number, string, string>

export const batch_take: DemoTake = [1, 2, 3] as const

export const failure_take: DemoTake = Exit.fail("boom")

export const completion_take: DemoTake = Exit.succeed("eof")

export const batch_pull = Take.toPull(batch_take)

export const failure_pull_exit = Effect.exit(Take.toPull(failure_take))

export const completion_value = Pull.catchDone(
    Take.toPull(completion_take),
    (done: string) => Effect.succeed(done)
)

export const stored_sequence: ReadonlyArray<DemoTake> = [
    batch_take,
    failure_take,
    completion_take,
]

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Represent"),
    S.Literal("Emit"),
    S.Literal("Fail"),
    S.Literal("Complete"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Represent",
    "Emit",
    "Fail",
    "Complete",
]

export const RepresentCase = S.Union([
    S.Literal("Union"),
    S.Literal("Batch"),
    S.Literal("Failure"),
    S.Literal("Done"),
])
export type RepresentCase = typeof RepresentCase.Type

export const represent_cases: ReadonlyArray<RepresentCase> = [
    "Union",
    "Batch",
    "Failure",
    "Done",
]

export const EmitCase = S.Union([
    S.Literal("ToPull"),
    S.Literal("Success"),
    S.Literal("NonEmpty"),
    S.Literal("Stored"),
])
export type EmitCase = typeof EmitCase.Type

export const emit_cases: ReadonlyArray<EmitCase> = [
    "ToPull",
    "Success",
    "NonEmpty",
    "Stored",
]

export const FailCase = S.Union([
    S.Literal("ExitFail"),
    S.Literal("ErrorChannel"),
    S.Literal("TypedError"),
    S.Literal("Preserve"),
])
export type FailCase = typeof FailCase.Type

export const fail_cases: ReadonlyArray<FailCase> = [
    "ExitFail",
    "ErrorChannel",
    "TypedError",
    "Preserve",
]

export const CompleteCase = S.Union([
    S.Literal("ExitSuccess"),
    S.Literal("DoneSignal"),
    S.Literal("CatchDone"),
    S.Literal("Value"),
])
export type CompleteCase = typeof CompleteCase.Type

export const complete_cases: ReadonlyArray<CompleteCase> = [
    "ExitSuccess",
    "DoneSignal",
    "CatchDone",
    "Value",
]

export const Model = S.Struct({
    stage: Stage,
    representCase: RepresentCase,
    emitCase: EmitCase,
    failCase: FailCase,
    completeCase: CompleteCase,
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
    Represent: {
        eyebrow: "one stored pull result · three possible shapes",
        title: "Represent emission, failure, or completion",
        description:
            "Take is a type alias, not a tagged class. A value is either a non-empty emitted batch or an Exit. Failed Exits represent ordinary failure; successful Exits represent normal completion with a Done value.",
        code: `type T = Take.Take<number, string, string>

const batch: T = [1, 2, 3]
const failed: T = Exit.fail("boom")
const done: T = Exit.succeed("eof")`,
        apis: ["Take.Take", "Exit.fail", "Exit.succeed"],
        notice: "Do not invent a separate End tag around Take. Completion is already encoded as a successful Exit carrying the Done value.",
    },

    Emit: {
        eyebrow: "non-empty arrays become successful Pull values",
        title: "Interpret emitted batches with toPull",
        description:
            "toPull turns a stored Take back into the low-level Pull protocol. A non-empty array becomes a successful pull value without changing the batch or allocating an intermediate stream.",
        code: `const take: Take.Take<number, string, string> =
    [1, 2, 3]

const pull = Take.toPull(take)
// Pull<NonEmptyReadonlyArray<number>, string, string>`,
        apis: ["Take.toPull", "Pull.Pull"],
        notice: "A Take batch is non-empty by type. Empty input is not an emitted batch; stream completion belongs in the successful Exit branch instead.",
    },

    Fail: {
        eyebrow: "failed Exit stays an ordinary Pull failure",
        title: "Preserve the typed error channel",
        description:
            "A failed Exit is already the stored failure result. toPull returns that failure into the Pull error channel, preserving the typed E instead of translating it into completion.",
        code: `const take: Take.Take<number, string, string> =
    Exit.fail("boom")

const exit = yield* Effect.exit(
    Take.toPull(take)
)`,
        apis: ["Exit.fail", "Take.toPull", "Effect.exit"],
        notice: "Failure and normal completion both use Exit at rest, but they are different Pull outcomes: failure remains E, while successful Exit becomes Cause.Done<Done>.",
    },

    Complete: {
        eyebrow: "successful Exit becomes Cause.Done in the Pull protocol",
        title: "Translate normal completion into Done",
        description:
            "A successful Exit does not become a successful emitted value. toPull translates its value into Cause.Done, which is how Pull communicates normal completion separately from ordinary failures.",
        code: `const take: Take.Take<number, string, string> =
    Exit.succeed("eof")

const done = yield* Pull.catchDone(
    Take.toPull(take),
    (value) => Effect.succeed(value)
)`,
        apis: ["Exit.succeed", "Take.toPull", "Pull.catchDone"],
        notice: "The Done type parameter is real data. Pull.catchDone recovers that completion value without swallowing ordinary E failures.",
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

export const represent_snapshot = (model: Model): Snapshot => {
    switch (model.representCase) {
        case "Union":
            return {
                input: "Take<A, E, Done>",
                operation: "inspect the type alias",
                result: "NonEmptyArray<A> | Exit<Done, E>",
                invariant: "there is no dedicated runtime Take object",
                implementation: "a structural union of batch or Exit",
                guidance:
                    "Use Take when one pull result must be stored or transferred before it is interpreted.",
            }
        case "Batch":
            return {
                input: "[1, 2, 3] as const",
                operation: "store as Take<number, string, string>",
                result: "emitted batch",
                invariant: "the array is statically non-empty",
                implementation: "NonEmptyReadonlyArray<number>",
                guidance:
                    "One Take may contain several emitted elements because stream pulls operate on batches.",
            }
        case "Failure":
            return {
                input: 'Exit.fail("boom")',
                operation: "store as Take",
                result: "ordinary failure branch",
                invariant: "E stays typed separately from Done",
                implementation: "Exit<never, string>",
                guidance:
                    "Use a failed Exit for producer failure, not for normal end-of-stream.",
            }
        case "Done":
            return {
                input: 'Exit.succeed("eof")',
                operation: "store as Take",
                result: "normal completion branch",
                invariant: "Done is carried as the Exit success value",
                implementation: "Exit<string, never>",
                guidance:
                    "Completion can carry data; it is not limited to void.",
            }
    }
}

export const emit_snapshot = (model: Model): Snapshot => {
    switch (model.emitCase) {
        case "ToPull":
            return {
                input: "batch Take [1, 2, 3]",
                operation: "Take.toPull(take)",
                result: "Pull succeeds with [1, 2, 3]",
                invariant:
                    "toPull interprets rather than copies the protocol meaning",
                implementation: "Effect.succeed(take) for the array branch",
                guidance:
                    "toPull is the only public conversion operation in this module.",
            }
        case "Success":
            return {
                input: "NonEmptyReadonlyArray<A>",
                operation: "toPull",
                result: "successful Pull batch",
                invariant: "emission uses the success channel",
                implementation: "Effect.succeed(batch)",
                guidance:
                    "A successful Pull value means more elements were emitted, not that the stream is finished.",
            }
        case "NonEmpty":
            return {
                input: "[]",
                operation: "try to model an emitted Take",
                result: "not a valid batch shape",
                invariant: "emitted batches contain at least one value",
                implementation: "NonEmptyReadonlyArray<A>",
                guidance:
                    "Use completion rather than an empty emitted batch to signal that no more elements exist.",
            }
        case "Stored":
            return {
                input: "queue / pubsub / deferred storage",
                operation: "move a Take value",
                result: "pull outcome preserved for later",
                invariant:
                    "batch, E failure, and Done completion survive storage",
                implementation: "plain union values",
                guidance:
                    "Take is useful at asynchronous boundaries where Pull itself cannot be executed immediately.",
            }
    }
}

export const fail_snapshot = (model: Model): Snapshot => {
    switch (model.failCase) {
        case "ExitFail":
            return {
                input: 'Exit.fail("boom")',
                operation: "Take.toPull",
                result: 'Pull fails with "boom"',
                invariant: "failed Exit is not converted to Cause.Done",
                implementation: "failed Exit is returned directly",
                guidance:
                    "Failure remains distinguishable from normal completion after conversion.",
            }
        case "ErrorChannel":
            return {
                input: "Take<A, E, Done>",
                operation: "toPull",
                result: "Pull<A[], E, Done>",
                invariant: "ordinary E remains in the Pull error channel",
                implementation: "Pull adds Cause.Done<Done> alongside E",
                guidance:
                    "Handle ordinary failures separately from Done-aware completion helpers.",
            }
        case "TypedError":
            return {
                input: "domain error E",
                operation: "store failed Exit",
                result: "same E after toPull",
                invariant: "Take does not erase or stringify typed failures",
                implementation: "Exit.Exit<Done, E>",
                guidance:
                    "Keep domain errors typed through the stored pull boundary.",
            }
        case "Preserve":
            return {
                input: "failure Take",
                operation: "Effect.exit(Take.toPull(take))",
                result: "inspect full Exit / Cause",
                invariant: "cause information survives the Pull effect",
                implementation: "toPull reuses the failed Exit",
                guidance:
                    "Use Effect.exit when diagnostics need the full failure cause rather than recovery.",
            }
    }
}

export const complete_snapshot = (model: Model): Snapshot => {
    switch (model.completeCase) {
        case "ExitSuccess":
            return {
                input: 'Exit.succeed("eof")',
                operation: "Take.toPull",
                result: 'Pull completes with Done "eof"',
                invariant: "successful Exit is completion, not emitted data",
                implementation: "Cause.done(take.value)",
                guidance:
                    "Do not expect Exit.succeed(Done) to appear in the Pull success channel.",
            }
        case "DoneSignal":
            return {
                input: "Done value",
                operation: "translate to Pull protocol",
                result: "Cause.Done<Done>",
                invariant: "Done is encoded in the error/cause side of Pull",
                implementation: "Pull extends Effect<A, E | Cause.Done<Done>>",
                guidance:
                    "Cause.Done is a control signal for normal completion, not an ordinary domain failure.",
            }
        case "CatchDone":
            return {
                input: "completion Pull",
                operation: "Pull.catchDone(pull, onDone)",
                result: "recover the Done value",
                invariant: "ordinary E failures remain untouched",
                implementation: "handles only Cause.Done completion",
                guidance:
                    "Use catchDone when completion data should become a normal Effect result.",
            }
        case "Value":
            return {
                input: 'Done = "eof"',
                operation: "catch completion",
                result: 'returns "eof"',
                invariant: "Done can carry structured application data",
                implementation: "successful Exit value becomes Done leftover",
                guidance:
                    "Keep Done meaningful when a producer must report a final cursor, count, or status.",
            }
    }
}

export const initial_model: Model = {
    stage: "Represent",
    representCase: "Union",
    emitCase: "ToPull",
    failCase: "ExitFail",
    completeCase: "ExitSuccess",
}

// -----------------------------------------------------------------------------
// MESSAGES + UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedTakeStage: { stage: Stage },
    SelectedTakeRepresentCase: { representCase: RepresentCase },
    SelectedTakeEmitCase: { emitCase: EmitCase },
    SelectedTakeFailCase: { failCase: FailCase },
    SelectedTakeCompleteCase: { completeCase: CompleteCase },
})
export type Message = typeof Message.Type

type StagePayload = Readonly<{ stage: Stage }>
type RepresentCasePayload = Readonly<{ representCase: RepresentCase }>
type EmitCasePayload = Readonly<{ emitCase: EmitCase }>
type FailCasePayload = Readonly<{ failCase: FailCase }>
type CompleteCasePayload = Readonly<{ completeCase: CompleteCase }>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedTakeStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, { stage: () => stage }),
        }),
        SelectedTakeRepresentCase: ({
            representCase,
        }: RepresentCasePayload) => ({
            model: modifyFields(model, { representCase: () => representCase }),
        }),
        SelectedTakeEmitCase: ({ emitCase }: EmitCasePayload) => ({
            model: modifyFields(model, { emitCase: () => emitCase }),
        }),
        SelectedTakeFailCase: ({ failCase }: FailCasePayload) => ({
            model: modifyFields(model, { failCase: () => failCase }),
        }),
        SelectedTakeCompleteCase: ({ completeCase }: CompleteCasePayload) => ({
            model: modifyFields(model, { completeCase: () => completeCase }),
        }),
    })
