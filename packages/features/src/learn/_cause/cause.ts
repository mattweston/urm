import { Cause, Option, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 Cause examples
// -----------------------------------------------------------------------------

export const typedFailure = Cause.fail("Validation failed")

export const defect = Cause.die(new Error("Unexpected defect"))

export const interrupted = Cause.interrupt(42)

export const combined = Cause.combine(
    Cause.fail("Validation failed"),
    Cause.combine(Cause.die("defect"), Cause.interrupt(42))
)

export const mapped = Cause.map(combined, (error) => `mapped: ${error}`)

export const firstTypedError = Cause.findErrorOption(combined)

export const interruptingFibers = Cause.interruptors(combined)

export const rendered = Cause.pretty(combined)

// -----------------------------------------------------------------------------
// Teaching demo
// -----------------------------------------------------------------------------

export const Stage = S.Literals(["Reasons", "Combine", "Inspect", "Render"])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Reasons",
    "Combine",
    "Inspect",
    "Render",
]

export const ReasonMode = S.Literals(["Fail", "Die", "Interrupt", "Empty"])
export type ReasonMode = typeof ReasonMode.Type

export const CombineMode = S.Literals(["TwoFails", "Mixed", "Dedupe", "Map"])
export type CombineMode = typeof CombineMode.Type

export const InspectMode = S.Literals([
    "Kinds",
    "FindError",
    "FindDefect",
    "Interruptors",
    "InterruptOnly",
])
export type InspectMode = typeof InspectMode.Type

export const RenderMode = S.Literals([
    "SquashFail",
    "SquashDefect",
    "InterruptOnly",
    "PrettyErrors",
    "Pretty",
])
export type RenderMode = typeof RenderMode.Type

export const Model = S.Struct({
    stage: Stage,
    reasonMode: ReasonMode,
    combineMode: CombineMode,
    inspectMode: InspectMode,
    renderMode: RenderMode,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
    SelectedCauseStage: {
        stage: Stage,
    },
    SelectedCauseReasonMode: {
        reasonMode: ReasonMode,
    },
    SelectedCauseCombineMode: {
        combineMode: CombineMode,
    },
    SelectedCauseInspectMode: {
        inspectMode: InspectMode,
    },
    SelectedCauseRenderMode: {
        renderMode: RenderMode,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Reasons",
    reasonMode: "Fail",
    combineMode: "Mixed",
    inspectMode: "Kinds",
    renderMode: "PrettyErrors",
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
    Message.match<UpdateReturn>(message, {
        SelectedCauseStage: ({ stage }) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedCauseReasonMode: ({ reasonMode }) => ({
            model: evo(model, {
                reasonMode: () => reasonMode,
            }),
        }),

        SelectedCauseCombineMode: ({ combineMode }) => ({
            model: evo(model, {
                combineMode: () => combineMode,
            }),
        }),

        SelectedCauseInspectMode: ({ inspectMode }) => ({
            model: evo(model, {
                inspectMode: () => inspectMode,
            }),
        }),

        SelectedCauseRenderMode: ({ renderMode }) => ({
            model: evo(model, {
                renderMode: () => renderMode,
            }),
        }),
    })

// -----------------------------------------------------------------------------
// Pure visual helpers
// -----------------------------------------------------------------------------

const unknownLabel = (value: unknown): string => {
    if (value instanceof Error) {
        return `${value.name}: ${value.message}`
    }
    if (typeof value === "string") {
        return value
    }
    try {
        return JSON.stringify(value)
    } catch {
        return String(value)
    }
}

export const reasonCause = (mode: ReasonMode): Cause.Cause<string> => {
    switch (mode) {
        case "Fail":
            return Cause.fail("Validation failed")
        case "Die":
            return Cause.die(new Error("Unexpected defect"))
        case "Interrupt":
            return Cause.interrupt(42)
        case "Empty":
            return Cause.empty
    }
}

export const reasonLabel = (
    reason: Cause.Reason<string>
): Readonly<{
    tag: string
    payload: string
}> => {
    if (Cause.isFailReason(reason)) {
        return {
            tag: "Fail",
            payload: `error = ${unknownLabel(reason.error)}`,
        }
    }

    if (Cause.isDieReason(reason)) {
        return {
            tag: "Die",
            payload: `defect = ${unknownLabel(reason.defect)}`,
        }
    }

    return {
        tag: "Interrupt",
        payload: `fiberId = ${String(reason.fiberId)}`,
    }
}

export const reasonResult = (
    mode: ReasonMode
): Readonly<{
    expression: string
    reasons: ReadonlyArray<
        Readonly<{
            tag: string
            payload: string
        }>
    >
    detail: string
}> => {
    const cause = reasonCause(mode)

    const expression =
        mode === "Fail"
            ? 'Cause.fail("Validation failed")'
            : mode === "Die"
              ? 'Cause.die(new Error("Unexpected defect"))'
              : mode === "Interrupt"
                ? "Cause.interrupt(42)"
                : "Cause.empty"

    const detail =
        mode === "Fail"
            ? "Fail carries the typed error value E from Effect's expected error channel."
            : mode === "Die"
              ? "Die carries an untyped defect: unexpected failure outside the typed error channel."
              : mode === "Interrupt"
                ? "Interrupt records fiber cancellation and may carry the interrupting fiber id."
                : "empty contains no reasons and acts as the identity for Cause.combine."

    return {
        expression,
        reasons: cause.reasons.map(reasonLabel),
        detail,
    }
}

export const combineCause = (mode: CombineMode): Cause.Cause<string> => {
    switch (mode) {
        case "TwoFails":
            return Cause.combine(Cause.fail("A"), Cause.fail("B"))

        case "Mixed":
            return Cause.combine(
                Cause.fail("typed"),
                Cause.combine(Cause.die("defect"), Cause.interrupt(7))
            )

        case "Dedupe":
            return Cause.combine(
                Cause.fail("same"),
                Cause.combine(Cause.fail("same"), Cause.fail("other"))
            )

        case "Map":
            return Cause.map(
                Cause.combine(
                    Cause.fail("a"),
                    Cause.combine(Cause.die("defect"), Cause.interrupt(9))
                ),
                (error) => error.toUpperCase()
            )
    }
}

export const combineResult = (
    mode: CombineMode
): Readonly<{
    expression: string
    reasons: ReadonlyArray<
        Readonly<{
            tag: string
            payload: string
        }>
    >
    detail: string
}> => {
    const cause = combineCause(mode)

    const expression =
        mode === "TwoFails"
            ? 'Cause.combine(Cause.fail("A"), Cause.fail("B"))'
            : mode === "Mixed"
              ? "Cause.combine(Fail, Die, Interrupt)"
              : mode === "Dedupe"
                ? 'combine(Fail("same"), Fail("same"), Fail("other"))'
                : "Cause.map(mixed, error => error.toUpperCase())"

    const detail =
        mode === "Dedupe"
            ? "combine merges reason arrays and de-duplicates reasons by value equality."
            : mode === "Map"
              ? "map transforms only Fail error values. Die defects and Interrupt reasons pass through unchanged."
              : "Cause.combine merges independent structured failures into one Cause instead of losing secondary reasons."

    return {
        expression,
        reasons: cause.reasons.map(reasonLabel),
        detail,
    }
}

export const inspectCause = (): Cause.Cause<string> =>
    Cause.combine(
        Cause.fail("typed error"),
        Cause.combine(
            Cause.die("database invariant"),
            Cause.combine(Cause.interrupt(11), Cause.interrupt(12))
        )
    )

const optionStringLabel = (value: Option.Option<string>): string =>
    Option.match(value, {
        onNone: () => "Option.none()",
        onSome: (value) => `Option.some(${JSON.stringify(value)})`,
    })

export const inspectResult = (
    mode: InspectMode
): Readonly<{
    expression: string
    output: string
    detail: string
}> => {
    const cause = inspectCause()

    switch (mode) {
        case "Kinds":
            return {
                expression: "hasFails / hasDies / hasInterrupts",
                output: `fails=${Cause.hasFails(cause)} · dies=${Cause.hasDies(cause)} · interrupts=${Cause.hasInterrupts(cause)}`,
                detail: "Kind predicates let diagnostics branch without manually scanning the reasons array.",
            }

        case "FindError":
            return {
                expression: "Cause.findErrorOption(cause)",
                output: optionStringLabel(Cause.findErrorOption(cause)),
                detail: "findErrorOption extracts the first typed Fail error and discards the rest of the Cause.",
            }

        case "FindDefect": {
            const result = Cause.findDefect(cause)

            return {
                expression: "Cause.findDefect(cause)",
                output:
                    result._tag === "Success"
                        ? `Result.success(${unknownLabel(result.success)})`
                        : "Result.failure(original Cause)",
                detail: "findDefect uses Result: success carries the first defect; failure preserves the original Cause when no Die exists.",
            }
        }

        case "Interruptors":
            return {
                expression: "Cause.interruptors(cause)",
                output: `Set(${Array.from(Cause.interruptors(cause)).join(", ")})`,
                detail: "interruptors collects every defined interrupting fiber id and removes duplicates through Set semantics.",
            }

        case "InterruptOnly": {
            const interruptOnly = Cause.combine(
                Cause.interrupt(1),
                Cause.interrupt(2)
            )

            return {
                expression: "Cause.hasInterruptsOnly(interruptOnly)",
                output: String(Cause.hasInterruptsOnly(interruptOnly)),
                detail: "hasInterruptsOnly is true only when there is at least one reason and every reason is Interrupt. Cause.empty returns false.",
            }
        }
    }
}

const squashLabel = (value: unknown): string => unknownLabel(value)

export const renderResult = (
    mode: RenderMode
): Readonly<{
    expression: string
    output: string
    detail: string
}> => {
    switch (mode) {
        case "SquashFail": {
            const cause = Cause.combine(
                Cause.fail("typed first"),
                Cause.die("secondary defect")
            )

            return {
                expression: "Cause.squash(Fail + Die)",
                output: squashLabel(Cause.squash(cause)),
                detail: "squash is deliberately lossy: Fail takes priority over Die, then interrupt-only / empty fall back to generic Errors.",
            }
        }

        case "SquashDefect": {
            const cause = Cause.combine(
                Cause.die("first defect"),
                Cause.interrupt(4)
            )

            return {
                expression: "Cause.squash(Die + Interrupt)",
                output: squashLabel(Cause.squash(cause)),
                detail: "With no typed Fail reason, squash returns the first defect.",
            }
        }

        case "InterruptOnly": {
            const cause = Cause.combine(Cause.interrupt(4), Cause.interrupt(5))
            const value = Cause.squash(cause)

            return {
                expression: "Cause.squash(interrupt-only)",
                output: squashLabel(value),
                detail: "An interrupt-only Cause squashes to a generic Error because there is no typed error or defect to throw.",
            }
        }

        case "PrettyErrors": {
            const cause = Cause.combine(
                Cause.fail(new Error("request failed")),
                Cause.die("cache invariant")
            )

            return {
                expression: "Cause.prettyErrors(cause)",
                output: Cause.prettyErrors(cause)
                    .map((error) => `${error.name}: ${error.message}`)
                    .join(" · "),
                detail: "prettyErrors is non-lossy across renderable Fail/Die reasons: it returns individual Error values suitable for logging.",
            }
        }

        case "Pretty": {
            const cause = Cause.combine(
                Cause.fail("request failed"),
                Cause.die("cache invariant")
            )

            const firstLines = Cause.pretty(cause)
                .split("\n")
                .slice(0, 4)
                .join("\n")

            return {
                expression: "Cause.pretty(cause)",
                output: firstLines,
                detail: "pretty renders the whole Cause as a human-readable logging/debug string, including cleaned stack information when present.",
            }
        }
    }
}
