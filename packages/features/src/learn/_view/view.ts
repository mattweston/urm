import { Match, Option, Schema as S } from "effect"
import { Submodel, type Update } from "foldkit"
import type { Document, Html, HtmlBuilder } from "foldkit/html"
import { inertHtml as ih } from "foldkit/html"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Child Submodel used by the composition example
// -----------------------------------------------------------------------------

export const ChildModel = S.Struct({
    count: S.Number,
})
export type ChildModel = typeof ChildModel.Type

export const ChildMessage = defineMessageUnion({
    ClickedIncrement: {},
})
export type ChildMessage = typeof ChildMessage.Type

export const childUpdate = (model: ChildModel, message: ChildMessage) =>
    ChildMessage.match<Update.Return<ChildModel, ChildMessage>>(message, {
        ClickedIncrement: () => ({
            model: evo(model, {
                count: (count) => count + 1,
            }),
        }),
    })

export const childView = Submodel.defineView<ChildModel, ChildMessage>(
    (model, h) =>
        h.div(
            [h.Class("rounded-lg border p-3")],
            [
                h.div(
                    [h.Class("font-mono text-sm")],
                    [`child count: ${model.count}`]
                ),
                h.button(
                    [h.OnClick(ChildMessage.ClickedIncrement())],
                    ["Child +1"]
                ),
            ]
        )
)

// -----------------------------------------------------------------------------
// Root application Model / Message
// -----------------------------------------------------------------------------

export const Locale = S.Literals(["English", "Arabic"])
export type Locale = typeof Locale.Type

export const Model = S.Struct({
    count: S.Number,
    search: S.String,
    locale: Locale,
    eventLog: S.Array(S.String),
    child: ChildModel,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
    ClickedIncrement: {},
    UpdatedSearch: {
        value: S.String,
    },
    PressedSearchKey: {
        key: S.String,
    },
    SelectedLocale: {
        locale: Locale,
    },
    GotChildMessage: {
        message: ChildMessage,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    count: 3,
    search: "",
    locale: "English",
    eventLog: [],
    child: ChildModel.make({
        count: 0,
    }),
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
    Message.match<UpdateReturn>(message, {
        ClickedIncrement: () => ({
            model: evo(model, {
                count: (count) => count + 1,
                eventLog: (log) => [...log, "ClickedIncrement"],
            }),
        }),

        UpdatedSearch: ({ value }) => ({
            model: evo(model, {
                search: () => value,
                eventLog: (log) => [...log, `UpdatedSearch("${value}")`],
            }),
        }),

        PressedSearchKey: ({ key }) => ({
            model: evo(model, {
                eventLog: (log) => [...log, `PressedSearchKey("${key}")`],
            }),
        }),

        SelectedLocale: ({ locale }) => ({
            model: evo(model, {
                locale: () => locale,
                eventLog: (log) => [...log, `SelectedLocale(${locale})`],
            }),
        }),

        GotChildMessage: ({ message }) => {
            const child = childUpdate(model.child, message)

            return {
                model: evo(model, {
                    child: () => child.model,
                }),
            }
        },
    })

// -----------------------------------------------------------------------------
// View helpers
// -----------------------------------------------------------------------------

const languageTag: Readonly<Record<Locale, string>> = {
    English: "en",
    Arabic: "ar",
}

const textDirection: Readonly<Record<Locale, "Ltr" | "Rtl">> = {
    English: "Ltr",
    Arabic: "Rtl",
}

// Handler-free module-scope markup uses inertHtml.
export const staticBadge = ih.span(
    [ih.Class("rounded-full border px-2 py-1 text-xs")],
    ["inert helper"]
)

// Extracted helpers take the live builder as their final parameter.
export const countView = (count: number, h: HtmlBuilder<Message>): Html =>
    h.div([h.Class("text-4xl font-bold")], [String(count)])

// A reusable helper can be generic over any parent Message universe.
export const genericNotice = <ParentMessage>(
    text: string,
    h: HtmlBuilder<ParentMessage>
): Html => h.p([h.Class("text-sm text-muted-foreground")], [text])

// Complex handlers are still pure translators from event data -> Message.
export const searchKeyMessage = (key: string): Option.Option<Message> =>
    Match.value(key).pipe(
        Match.when("Enter", () =>
            Option.some(
                Message.PressedSearchKey({
                    key,
                })
            )
        ),
        Match.when("Escape", () =>
            Option.some(
                Message.PressedSearchKey({
                    key,
                })
            )
        ),
        Match.orElse(() => Option.none())
    )

// -----------------------------------------------------------------------------
// A real root application view
// -----------------------------------------------------------------------------

export const applicationView = (
    model: Model,
    h: HtmlBuilder<Message>
): Document => ({
    title:
        model.locale === "English"
            ? `Counter ${model.count}`
            : `العداد ${model.count}`,

    lang: languageTag[model.locale],
    dir: textDirection[model.locale],

    canonical: "https://example.test/counter",

    ogUrl: "https://example.test/counter",

    body: h.main(
        [h.Class("mx-auto flex max-w-xl flex-col gap-4 p-6")],
        [
            staticBadge,

            genericNotice("The view is a pure description of Model → HTML.", h),

            countView(model.count, h),

            h.button([h.OnClick(Message.ClickedIncrement())], ["Increment"]),

            h.input([
                h.Value(model.search),
                h.OnInput((value) =>
                    Message.UpdatedSearch({
                        value,
                    })
                ),
                h.OnKeyDownPreventDefault(searchKeyMessage),
            ]),

            h.div(
                [],
                [
                    h.button(
                        [
                            h.OnClick(
                                Message.SelectedLocale({
                                    locale: "English",
                                })
                            ),
                        ],
                        ["English"]
                    ),
                    h.button(
                        [
                            h.OnClick(
                                Message.SelectedLocale({
                                    locale: "Arabic",
                                })
                            ),
                        ],
                        ["Arabic"]
                    ),
                ]
            ),

            h.submodel({
                slotId: "child-counter",
                model: model.child,
                view: childView,
                toParentMessage: (message) =>
                    Message.GotChildMessage({
                        message,
                    }),
            }),
        ]
    ),
})

// -----------------------------------------------------------------------------
// Teaching-demo Model
// -----------------------------------------------------------------------------

export const Stage = S.Literals(["Render", "Document", "Events", "Composition"])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Render",
    "Document",
    "Events",
    "Composition",
]

export const DemoModel = S.Struct({
    stage: Stage,
    app: Model,
    claimedKey: S.String,
})
export type DemoModel = typeof DemoModel.Type

export const DemoMessage = defineMessageUnion({
    SelectedViewStage: {
        stage: Stage,
    },
    GotAppMessage: {
        message: Message,
    },
    SelectedClaimedKey: {
        key: S.String,
    },
    ClickedResetViewDemo: {},
})
export type DemoMessage = typeof DemoMessage.Type

export const demoInit: DemoModel = DemoModel.make({
    stage: "Render",
    app: init,
    claimedKey: "Enter",
})

type DemoUpdateReturn = Update.Return<DemoModel, DemoMessage>

export const demoUpdate = (model: DemoModel, message: DemoMessage) =>
    DemoMessage.match<DemoUpdateReturn>(message, {
        SelectedViewStage: ({ stage }) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        GotAppMessage: ({ message }) => {
            const next = update(model.app, message)

            return {
                model: evo(model, {
                    app: () => next.model,
                }),
            }
        },

        SelectedClaimedKey: ({ key }) => ({
            model: evo(model, {
                claimedKey: () => key,
            }),
        }),

        ClickedResetViewDemo: () => ({
            model: demoInit,
        }),
    })

// -----------------------------------------------------------------------------
// Pure helpers for visual panels
// -----------------------------------------------------------------------------

export const documentFacts = (
    model: Model
): ReadonlyArray<readonly [string, string]> => [
    [
        "title",
        model.locale === "English"
            ? `Counter ${model.count}`
            : `العداد ${model.count}`,
    ],
    ["lang", languageTag[model.locale]],
    ["dir", textDirection[model.locale]],
    ["canonical", "https://example.test/counter"],
    ["ogUrl", "https://example.test/counter"],
]

export const eventPreview = (
    model: DemoModel
): Readonly<{
    key: string
    output: string
    claimed: boolean
}> => {
    const option = searchKeyMessage(model.claimedKey)

    return Option.match(option, {
        onNone: () => ({
            key: model.claimedKey,
            output: "Option.none()",
            claimed: false,
        }),
        onSome: (message) => ({
            key: model.claimedKey,
            output: JSON.stringify(message),
            claimed: true,
        }),
    })
}
