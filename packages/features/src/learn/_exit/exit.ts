import { Cause, Effect, Exit, Option, Result, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

export const Stage = S.Union([
    S.Literal("Outcomes"),
    S.Literal("Inspect"),
    S.Literal("Transform"),
    S.Literal("Extract"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Outcomes",
    "Inspect",
    "Transform",
    "Extract",
]

export const OutcomeCase = S.Union([
    S.Literal("Success"),
    S.Literal("Failure"),
    S.Literal("Defect"),
    S.Literal("Interrupt"),
])
export type OutcomeCase = typeof OutcomeCase.Type

export const InspectCase = S.Union([
    S.Literal("Success"),
    S.Literal("Failure"),
    S.Literal("Defect"),
])
export type InspectCase = typeof InspectCase.Type

export const TransformCase = S.Union([
    S.Literal("Success"),
    S.Literal("Failure"),
    S.Literal("All"),
])
export type TransformCase = typeof TransformCase.Type

export const ExtractCase = S.Union([
    S.Literal("Success"),
    S.Literal("Failure"),
    S.Literal("Defect"),
])
export type ExtractCase = typeof ExtractCase.Type

export const Model = S.Struct({
    stage: Stage,
    outcomeCase: OutcomeCase,
    inspectCase: InspectCase,
    transformCase: TransformCase,
    extractCase: ExtractCase,
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
    Outcomes: {
        eyebrow: "completed Effect result",
        title: "Exit keeps success and the full failure Cause as data",
        description:
            "A successful Exit stores A. A failed Exit stores Cause<E>, preserving typed failures, defects, and interruption after an Effect has finished.",
        code: `Exit.succeed(42)
Exit.fail("not found")
Exit.die(new Error("boom"))
Exit.interrupt(42)

Exit.failCause(
    Cause.fail("typed error")
)

Exit.void

Effect.runSync(
    Exit.succeed(42)
)
// 42`,
        apis: [
            "Exit.Exit",
            "Exit.Success",
            "Exit.Failure",
            "Exit.succeed",
            "Exit.fail",
            "Exit.failCause",
            "Exit.die",
            "Exit.interrupt",
            "Exit.void",
        ],
        notice: "Defects and interruptions do not widen the typed E channel. They live inside Cause, which is why a Failure preserves more information than a simple error value.",
    },

    Inspect: {
        eyebrow: "narrow + match",
        title: "Guards distinguish both the Exit branch and Cause reason kinds",
        description:
            "Use isSuccess / isFailure for the outer branch, then hasFails / hasDies / hasInterrupts when the reason kind matters. match handles success versus full Cause exhaustively.",
        code: `const exit =
    Exit.fail("not found")

Exit.isExit(exit)       // true
Exit.isFailure(exit)    // true
Exit.hasFails(exit)     // true
Exit.hasDies(exit)      // false
Exit.hasInterrupts(exit)// false

Exit.match(exit, {
    onSuccess: (value) =>
        \`value: \${value}\`,
    onFailure: (cause) =>
        \`reasons: \${cause.reasons.length}\`
})`,
        apis: [
            "Exit.isExit",
            "Exit.isSuccess",
            "Exit.isFailure",
            "Exit.hasFails",
            "Exit.hasDies",
            "Exit.hasInterrupts",
            "Exit.match",
            "Exit.getSuccess",
            "Exit.getCause",
            "Exit.findErrorOption",
        ],
        notice: "getSuccess / getCause return Option and lose the opposite branch by design. findErrorOption only searches for the first typed Fail reason; defect-only and interrupt-only failures return None.",
    },

    Transform: {
        eyebrow: "pure result transformation",
        title: "Map either channel without rerunning the Effect",
        description:
            "Exit combinators operate synchronously on completed result data. map changes A, mapError changes only typed Fail reasons, mapBoth handles both typed channels, and asVoid discards success values.",
        code: `Exit.map(
    Exit.succeed(21),
    (value) => value * 2
)
// Success(42)

Exit.mapError(
    Exit.fail("bad input"),
    (error) => error.toUpperCase()
)
// Failure("BAD INPUT")

Exit.asVoidAll([
    Exit.succeed(1),
    Exit.fail("a"),
    Exit.fail("b")
])
// one Failure with both Causes`,
        apis: [
            "Exit.map",
            "Exit.mapError",
            "Exit.mapBoth",
            "Exit.asVoid",
            "Exit.asVoidAll",
        ],
        notice: "mapError and mapBoth transform typed Fail reasons only. Defects and interruptions remain untouched. asVoidAll traverses every Exit and combines all failure Causes rather than stopping at the first.",
    },

    Extract: {
        eyebrow: "Result-based filtering",
        title: "Filtering APIs keep the rejected branch as data",
        description:
            "The v4 filter helpers return Result, not Option and not Effect. A successful extraction goes in Result.Success; a rejected extraction stores the original opposite Exit branch in Result.Failure.",
        code: `Exit.filterValue(
    Exit.succeed(42)
)
// Result.succeed(42)

Exit.filterValue(
    Exit.fail("err")
)
// Result.fail(Failure)

Exit.findError(
    Exit.fail("err")
)
// Result.succeed("err")

Exit.findDefect(
    Exit.die("boom")
)
// Result.succeed("boom")`,
        apis: [
            "Exit.filterSuccess",
            "Exit.filterValue",
            "Exit.filterFailure",
            "Exit.filterCause",
            "Exit.findError",
            "Exit.findDefect",
        ],
        notice: "These helpers are aimed at Result / Filter composition. A Result.Failure here means the Exit was not the requested shape; it does not mean the filtering operation failed as an Effect.",
    },
}

const outcome_exit = (outcomeCase: OutcomeCase): Exit.Exit<number, string> => {
    if (outcomeCase === "Failure") {
        return Exit.fail("not found")
    }
    if (outcomeCase === "Defect") {
        return Exit.die(new Error("boom"))
    }
    if (outcomeCase === "Interrupt") {
        return Exit.interrupt(42)
    }
    return Exit.succeed(42)
}

export type OutcomeSnapshot = Readonly<{
    tag: string
    value: string
    typedError: string
    hasFails: boolean
    hasDies: boolean
    hasInterrupts: boolean
    isEffect: boolean
    runAsEffect: string
}>

export const outcome_snapshot = (model: Model): OutcomeSnapshot => {
    const exit = outcome_exit(model.outcomeCase)

    return {
        tag: exit._tag,
        value: Exit.isSuccess(exit) ? String(exit.value) : "—",
        typedError: Option.match(Exit.findErrorOption(exit), {
            onNone: () => "None",
            onSome: (error: string) => error,
        }),
        hasFails: Exit.hasFails(exit),
        hasDies: Exit.hasDies(exit),
        hasInterrupts: Exit.hasInterrupts(exit),
        isEffect: Effect.isEffect(exit),
        runAsEffect: Exit.isSuccess(exit)
            ? String(Effect.runSync(exit))
            : "would fail as Effect",
    }
}

const inspect_exit = (inspectCase: InspectCase): Exit.Exit<number, string> =>
    inspectCase === "Failure"
        ? Exit.fail("validation")
        : inspectCase === "Defect"
          ? Exit.die(new Error("invariant"))
          : Exit.succeed(7)

const option_state = <A>(
    option: Option.Option<A>,
    format: (value: A) => string
): string =>
    Option.match(option, {
        onNone: () => "None",
        onSome: (value: A) => `Some(${format(value)})`,
    })

export type InspectSnapshot = Readonly<{
    tag: string
    isExit: boolean
    isSuccess: boolean
    isFailure: boolean
    hasFails: boolean
    hasDies: boolean
    hasInterrupts: boolean
    matched: string
    successOption: string
    causeOption: string
    errorOption: string
}>

export const inspect_snapshot = (model: Model): InspectSnapshot => {
    const exit = inspect_exit(model.inspectCase)

    return {
        tag: exit._tag,
        isExit: Exit.isExit(exit),
        isSuccess: Exit.isSuccess(exit),
        isFailure: Exit.isFailure(exit),
        hasFails: Exit.hasFails(exit),
        hasDies: Exit.hasDies(exit),
        hasInterrupts: Exit.hasInterrupts(exit),
        matched: Exit.match(exit, {
            onSuccess: (value: number) => `success:${value}`,
            onFailure: (cause: Cause.Cause<string>) =>
                `failure:${cause.reasons.length} reason(s)`,
        }),
        successOption: option_state(Exit.getSuccess(exit), (value: number) =>
            String(value)
        ),
        causeOption: option_state(
            Exit.getCause(exit),
            (cause: Cause.Cause<string>) => `${cause.reasons.length} reason(s)`
        ),
        errorOption: option_state(Exit.findErrorOption(exit), (error: string) =>
            JSON.stringify(error)
        ),
    }
}

export type TransformSnapshot = Readonly<{
    source: string
    operation: string
    result: string
    causeKinds: string
    allCount: number
    allHasFails: boolean
}>

export const transform_snapshot = (model: Model): TransformSnapshot => {
    if (model.transformCase === "Failure") {
        const result = Exit.mapError(Exit.fail("bad input"), (error: string) =>
            error.toUpperCase()
        )

        return {
            source: 'Failure("bad input")',
            operation: "mapError(toUpperCase)",
            result: Option.match(Exit.findErrorOption(result), {
                onNone: () => "no typed error",
                onSome: (error: string) => `Failure(${JSON.stringify(error)})`,
            }),
            causeKinds: `fail=${Exit.hasFails(result)} · die=${Exit.hasDies(result)}`,
            allCount: 1,
            allHasFails: Exit.hasFails(result),
        }
    }

    if (model.transformCase === "All") {
        const exits: ReadonlyArray<Exit.Exit<number, string>> = [
            Exit.succeed(1),
            Exit.fail("a"),
            Exit.fail("b"),
        ]

        const result = Exit.asVoidAll(exits)

        return {
            source: "Success(1), Failure(a), Failure(b)",
            operation: "asVoidAll",
            result: result._tag,
            causeKinds: Exit.isFailure(result)
                ? `${result.cause.reasons.length} combined reason(s)`
                : "no causes",
            allCount: exits.length,
            allHasFails: Exit.hasFails(result),
        }
    }

    const mapped = Exit.map(Exit.succeed(21), (value: number) => value * 2)

    const both = Exit.mapBoth(mapped, {
        onSuccess: (value: number) => `value:${value}`,
        onFailure: (error: string) => `error:${error}`,
    })

    const voided = Exit.asVoid(mapped)

    return {
        source: "Success(21)",
        operation: "map ×2 → mapBoth → asVoid",
        result: Exit.isSuccess(both) ? both.value : "failure",
        causeKinds: `asVoid=${voided._tag}`,
        allCount: 1,
        allHasFails: false,
    }
}

const extract_exit = (extractCase: ExtractCase): Exit.Exit<number, string> =>
    extractCase === "Failure"
        ? Exit.fail("not found")
        : extractCase === "Defect"
          ? Exit.die("boom")
          : Exit.succeed(42)

const result_tag = <A, E>(result: Result.Result<A, E>): string => result._tag

const result_success_value = <A, E>(
    result: Result.Result<A, E>,
    format: (value: A) => string
): string => (Result.isSuccess(result) ? format(result.success) : "rejected")

export type ExtractSnapshot = Readonly<{
    exitTag: string
    filterSuccess: string
    filterValue: string
    filterFailure: string
    filterCause: string
    findError: string
    findDefect: string
    requestedValue: string
}>

export const extract_snapshot = (model: Model): ExtractSnapshot => {
    const exit = extract_exit(model.extractCase)
    const filterSuccess = Exit.filterSuccess(exit)
    const filterValue = Exit.filterValue(exit)
    const filterFailure = Exit.filterFailure(exit)
    const filterCause = Exit.filterCause(exit)
    const foundError = Exit.findError(exit)
    const foundDefect = Exit.findDefect(exit)

    return {
        exitTag: exit._tag,
        filterSuccess: result_tag(filterSuccess),
        filterValue: result_tag(filterValue),
        filterFailure: result_tag(filterFailure),
        filterCause: result_tag(filterCause),
        findError: result_success_value(foundError, (error: string) =>
            JSON.stringify(error)
        ),
        findDefect: result_success_value(foundDefect, (defect: unknown) =>
            String(defect)
        ),
        requestedValue: result_success_value(filterValue, (value: number) =>
            String(value)
        ),
    }
}

export const Message = defineMessageUnion({
    SelectedExitStage: {
        stage: Stage,
    },
    SelectedExitOutcomeCase: {
        outcomeCase: OutcomeCase,
    },
    SelectedExitInspectCase: {
        inspectCase: InspectCase,
    },
    SelectedExitTransformCase: {
        transformCase: TransformCase,
    },
    SelectedExitExtractCase: {
        extractCase: ExtractCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Outcomes",
    outcomeCase: "Success",
    inspectCase: "Failure",
    transformCase: "Success",
    extractCase: "Failure",
})

type StagePayload = Readonly<{
    stage: Stage
}>
type OutcomeCasePayload = Readonly<{
    outcomeCase: OutcomeCase
}>
type InspectCasePayload = Readonly<{
    inspectCase: InspectCase
}>
type TransformCasePayload = Readonly<{
    transformCase: TransformCase
}>
type ExtractCasePayload = Readonly<{
    extractCase: ExtractCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedExitStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedExitOutcomeCase: ({ outcomeCase }: OutcomeCasePayload) => ({
            model: evo(model, {
                outcomeCase: () => outcomeCase,
            }),
        }),

        SelectedExitInspectCase: ({ inspectCase }: InspectCasePayload) => ({
            model: evo(model, {
                inspectCase: () => inspectCase,
            }),
        }),

        SelectedExitTransformCase: ({
            transformCase,
        }: TransformCasePayload) => ({
            model: evo(model, {
                transformCase: () => transformCase,
            }),
        }),

        SelectedExitExtractCase: ({ extractCase }: ExtractCasePayload) => ({
            model: evo(model, {
                extractCase: () => extractCase,
            }),
        }),
    })
