import { Duration, Effect, Match as M, Schema as S, Stream } from "effect"
import { Command, Port, Runtime, Subscription } from "foldkit"
import { type Html, type HtmlBuilder } from "foldkit/html"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"

// MODEL

export const Model = S.Struct({ count: S.Number, step: S.Number })
export type Model = typeof Model.Type

// MESSAGE

export const Ticked = taggedStruct("Ticked")
export const ClickedAdvance = taggedStruct("ClickedAdvance")
export const ChangedStep = taggedStruct("ChangedStep", { step: S.Number })
export const CompletedReportCount = taggedStruct("CompletedReportCount")

export const Message = S.Union([
    Ticked,
    ClickedAdvance,
    ChangedStep,
    CompletedReportCount,
])
export type Message = typeof Message.Type

// PORT

export const ports = {
    inbound: { stepChanged: Port.inbound(S.Number) },
    outbound: { countChanged: Port.outbound(S.Number) },
}

// INIT

export const Flags = S.Struct({ initialCount: S.Number })
export type Flags = typeof Flags.Type

export const init: Runtime.ElementInit<Model, Message, Flags> = (flags) => ({
    model: { count: flags.initialCount, step: 1 },
    commands: [],
})

// COMMAND

const ReportCount = Command.define("ReportCount", {
    args: { count: S.Number },
    messages: [CompletedReportCount],
    execute: ({ count }) =>
        Port.emit(ports.outbound.countChanged, count).pipe(
            Effect.as(CompletedReportCount())
        ),
})

// UPDATE

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const advance = (model: Model): UpdateReturn => {
    const count = model.count + model.step

    return [modifyFields(model, { count: () => count }), [ReportCount({ count })]]
}

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            Ticked: () => advance(model),
            ClickedAdvance: () => advance(model),
            ChangedStep: ({ step }) => [modifyFields(model, { step: () => step }), []],
            CompletedReportCount: () => [model, []],
        })
    )

// SUBSCRIPTION

const TICK_INTERVAL = Duration.seconds(1)

export const subscriptions = Subscription.make<Model, Message>()((_entry) => ({
    tick: Subscription.persistent(
        Stream.tick(TICK_INTERVAL).pipe(Stream.map(Ticked))
    ),
    hostStep: Port.subscription(ports.inbound.stepChanged, (step) =>
        ChangedStep({ step })
    ),
}))

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
    return h.div(
        [
            h.Class(
                "flex flex-col items-center gap-4 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-teal-200 bg-teal-50 p-6"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "text-xs font-semibold uppercase tracking-wide text-teal-700"
                    ),
                ],
                ["Foldkit widget"]
            ),
            h.div(
                [h.Class("text-5xl font-bold tabular-nums text-gray-900")],
                [String(model.count)]
            ),
            h.div(
                [h.Class("text-sm text-gray-600")],
                [`Ticking up by ${model.step} every second`]
            ),
            h.button(
                [
                    h.Class(
                        "cursor-pointer rounded-[var(--radius-control)] bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 [box-shadow:var(--shadow-control)]"
                    ),
                    h.OnClick(ClickedAdvance()),
                ],
                [`Advance by ${model.step}`]
            ),
        ]
    )
}

// PROGRAM

export const makeElement = (
    container: HTMLElement,
    flags: Flags
): Runtime.MakeRuntimeReturn<typeof ports> =>
    Runtime.makeElement({
        Model,
        Flags,
        flags: Effect.succeed(flags),
        init,
        update: (
            model: Parameters<typeof update>[0],
            message: Parameters<typeof update>[1]
        ) => {
            const [next_model, commands] = update(model, message)
            return { model: next_model, commands }
        },
        view,
        subscriptions,
        ports,
        container,
        devTools: {
            Message,
        },
    })
