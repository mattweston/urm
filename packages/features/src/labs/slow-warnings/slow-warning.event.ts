import { Match as M, Option } from "effect"
import { Runtime } from "foldkit"
import type { SlowWarningReport } from "./model.ts"

export const SLOW_WARNING_EVENT = "foldkit:slow-warning"

const slowWarningTarget = new EventTarget()

export const dispatchSlowWarning = (report: SlowWarningReport): void => {
    slowWarningTarget.dispatchEvent(
        new CustomEvent<SlowWarningReport>(SLOW_WARNING_EVENT, {
            detail: report,
        })
    )
}

type AnyMessage = { readonly _tag: string }

const messageToTag = ({ _tag }: AnyMessage): string => _tag

const maybeMessageTrigger = (maybeMessage: Option.Option<AnyMessage>): string =>
    Option.match(maybeMessage, {
        onNone: () => "initial render",
        onSome: messageToTag,
    })

const triggerForSlowContext = (
    context: Runtime.SlowContext<unknown, AnyMessage>
): string =>
    M.value(context).pipe(
        M.withReturnType<string>(),
        M.tagsExhaustive({
            Update: ({ message }) => messageToTag(message),
            View: ({ message }) => maybeMessageTrigger(message),
            Patch: ({ message }) => maybeMessageTrigger(message),
            SubscriptionDependencies: ({ subscriptionKey }) => subscriptionKey,
        })
    )

const detailsForSlowContext = (
    context: Runtime.SlowContext<unknown, unknown>
): string =>
    M.value(context).pipe(
        M.withReturnType<string>(),
        M.tagsExhaustive({
            Update: () =>
                "CPU work ran inside update before Foldkit could return the next Model.",
            View: () =>
                "The view function performed expensive synchronous work while building the next VNode tree.",
            Patch: () =>
                "The patch phase inserted thousands of keyed rows into the live DOM.",
            SubscriptionDependencies: () =>
                "A subscription spent time deriving its dependency struct from the Model.",
        })
    )

export const handleSlow = (
    context: Runtime.SlowContext<unknown, AnyMessage>
): void => {
    Runtime.defaultSlowCallback(context)

    const report: SlowWarningReport = {
        phase: context._tag,
        durationMs: context.durationMs,
        thresholdMs: context.thresholdMs,
        trigger: triggerForSlowContext(context),
        details: detailsForSlowContext(context),
    }

    dispatchSlowWarning(report)
}

export const slowWarningEventTarget = (): EventTarget => slowWarningTarget
