import { Duration, Effect, Schema as S, Stream } from "effect"
import { Command, Runtime, Subscription, type Update } from "foldkit"
import type { Document, Html, HtmlBuilder } from "foldkit/html"
import { UrlRequest } from "foldkit/navigation"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"
import { Url, toString as urlToString } from "foldkit/url"

// -----------------------------------------------------------------------------
// A small real Foldkit program used to demonstrate Runtime.makeApplication
// and Runtime.makeElement.
//
// Nothing in this module starts a runtime at import time.
// -----------------------------------------------------------------------------

export const Model = S.Struct({
    count: S.Number,
    ticks: S.Number,
    persistedCount: S.Number,
    lastRuntimeEvent: S.String,
    currentUrl: S.String,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
    ClickedIncrement: {},
    CompletedPersistCount: {
        count: S.Number,
    },
    Ticked: {},
    ClickedLink: {
        request: UrlRequest,
    },
    ChangedUrl: {
        url: Url,
    },
})
export type Message = typeof Message.Type

export const init: Runtime.ApplicationInit<Model, Message> = () => ({
    model: Model.make({
        count: 0,
        ticks: 0,
        persistedCount: 0,
        lastRuntimeEvent: "init → first Model",
        currentUrl: "(routing disabled)",
    }),
})

export const routedInit: Runtime.RoutingApplicationInit<Model, Message> = (
    url
) => ({
    model: Model.make({
        count: 0,
        ticks: 0,
        persistedCount: 0,
        lastRuntimeEvent: "routing init(url)",
        currentUrl: urlToString(url),
    }),
})

export const PersistCount = Command.define("PersistCount", {
    args: {
        count: S.Number,
    },
    messages: [Message.CompletedPersistCount],
    execute: ({ count }) =>
        Effect.sleep("300 millis").pipe(
            Effect.as(
                Message.CompletedPersistCount({
                    count,
                })
            )
        ),
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
    Message.match<UpdateReturn>(message, {
        ClickedIncrement: () => {
            const next = model.count + 1

            return {
                model: modifyFields(model, {
                    count: () => next,
                    lastRuntimeEvent: () => "update handled ClickedIncrement",
                }),
                commands: [
                    PersistCount({
                        count: next,
                    }),
                ],
            }
        },

        CompletedPersistCount: ({ count }) => ({
            model: modifyFields(model, {
                persistedCount: () => count,
                lastRuntimeEvent: () =>
                    "runtime dispatched CompletedPersistCount",
            }),
        }),

        Ticked: () => ({
            model: modifyFields(model, {
                ticks: (ticks) => ticks + 1,
                lastRuntimeEvent: () => "subscription emitted Ticked",
            }),
        }),

        ClickedLink: ({ request }) => ({
            model: modifyFields(model, {
                lastRuntimeEvent: () =>
                    UrlRequest.match(request, {
                        Internal: ({ url }) =>
                            `onUrlRequest → Internal(${urlToString(url)})`,
                        External: ({ href }) =>
                            `onUrlRequest → External(${href})`,
                    }),
            }),
        }),

        ChangedUrl: ({ url }) => ({
            model: modifyFields(model, {
                currentUrl: () => urlToString(url),
                lastRuntimeEvent: () => "onUrlChange → ChangedUrl",
            }),
        }),
    })

export const subscriptions = Subscription.make<Model, Message>()((entry) => ({
    tick: Subscription.persistentEntry(
        Stream.tick(Duration.seconds(5)).pipe(Stream.map(Message.Ticked))
    ),
}))

export const applicationView = (
    model: Model,
    h: HtmlBuilder<Message>
): Document => ({
    title: `Runtime demo · ${model.count}`,

    lang: "en",

    body: h.main(
        [h.Class("mx-auto max-w-lg p-6")],
        [
            h.h1([], [`Count: ${model.count}`]),
            h.p([], [`Persisted: ${model.persistedCount}`]),
            h.p([], [`Ticks: ${model.ticks}`]),
            h.button([h.OnClick(Message.ClickedIncrement())], ["Increment"]),
        ]
    ),
})

export const elementView = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.section(
        [h.Class("rounded-lg border p-4")],
        [
            h.h2([], [`Widget count: ${model.count}`]),
            h.button([h.OnClick(Message.ClickedIncrement())], ["Increment"]),
        ]
    )

// -----------------------------------------------------------------------------
// Real Runtime factories.
//
// Passing a container creates the runtime program value but does not call
// Runtime.run / Runtime.embed from this learn module.
// -----------------------------------------------------------------------------

export const makePageProgram = (container: HTMLElement) =>
    Runtime.makeApplication({
        Model,
        init,
        update,
        view: applicationView,
        subscriptions,
        container,
    })

export const makeRoutedPageProgram = (container: HTMLElement) =>
    Runtime.makeApplication({
        Model,
        init: routedInit,
        update,
        view: applicationView,
        subscriptions,
        container,

        routing: {
            onUrlRequest: (request) =>
                Message.ClickedLink({
                    request,
                }),

            onUrlChange: (url) =>
                Message.ChangedUrl({
                    url,
                }),
        },
    })

export const makeWidgetProgram = (container: HTMLElement) =>
    Runtime.makeElement({
        Model,
        init,
        update,
        view: elementView,
        subscriptions,
        container,
    })

// -----------------------------------------------------------------------------
// Startup sketches.
//
// Kept as source strings so the lesson never owns the host page lifetime.
// -----------------------------------------------------------------------------

export const runSketch = `
const application =
  makePageProgram(
    document.getElementById("root")!
  )

Runtime.run(application)
`

export const embedSketch = `
const element =
  makeWidgetProgram(
    document.getElementById("widget")!
  )

const handle =
  Runtime.embed(element)

// host-controlled teardown
handle.dispose()
`

export const routingSketch = `
const application =
  Runtime.makeApplication({
    Model,
    init: routedInit,
    update,
    view,
    container,

    routing: {
      onUrlRequest:
        request =>
          Message.ClickedLink({
            request
          }),

      onUrlChange:
        url =>
          Message.ChangedUrl({
            url
          })
    }
  })

Runtime.run(application)
`

// -----------------------------------------------------------------------------
// Teaching demo
// -----------------------------------------------------------------------------

export const Stage = S.Literals(["Ownership", "Lifetime", "Routing", "Loop"])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Ownership",
    "Lifetime",
    "Routing",
    "Loop",
]

export const OwnershipMode = S.Literals(["Application", "Element"])
export type OwnershipMode = typeof OwnershipMode.Type

export const LifetimeMode = S.Literals(["Run", "Embed"])
export type LifetimeMode = typeof LifetimeMode.Type

export const RoutingMode = S.Literals(["Off", "On"])
export type RoutingMode = typeof RoutingMode.Type

export const LoopStep = S.Union([
    S.Literal(0),
    S.Literal(1),
    S.Literal(2),
    S.Literal(3),
    S.Literal(4),
    S.Literal(5),
])
export type LoopStep = typeof LoopStep.Type

export const DemoModel = S.Struct({
    stage: Stage,

    ownership: OwnershipMode,

    lifetime: LifetimeMode,

    routing: RoutingMode,

    embedDisposed: S.Boolean,

    loopStep: LoopStep,
})
export type DemoModel = typeof DemoModel.Type

export const DemoMessage = defineMessageUnion({
    SelectedRuntimeStage: {
        stage: Stage,
    },

    SelectedOwnershipMode: {
        ownership: OwnershipMode,
    },

    SelectedLifetimeMode: {
        lifetime: LifetimeMode,
    },

    SelectedRoutingMode: {
        routing: RoutingMode,
    },

    ClickedDisposeEmbed: {},

    ClickedAdvanceRuntimeLoop: {},

    ClickedResetRuntimeLoop: {},

    ClickedResetRuntimeDemo: {},
})
export type DemoMessage = typeof DemoMessage.Type

export const demoInit: DemoModel = DemoModel.make({
    stage: "Ownership",
    ownership: "Application",
    lifetime: "Run",
    routing: "Off",
    embedDisposed: false,
    loopStep: 0,
})

type DemoUpdateReturn = Update.Return<DemoModel, DemoMessage>

const nextLoopStep = (step: LoopStep): LoopStep =>
    step === 0
        ? 1
        : step === 1
          ? 2
          : step === 2
            ? 3
            : step === 3
              ? 4
              : step === 4
                ? 5
                : 5

export const demoUpdate = (model: DemoModel, message: DemoMessage) =>
    DemoMessage.match<DemoUpdateReturn>(message, {
        SelectedRuntimeStage: ({ stage }) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedOwnershipMode: ({ ownership }) => ({
            model: modifyFields(model, {
                ownership: () => ownership,
            }),
        }),

        SelectedLifetimeMode: ({ lifetime }) => ({
            model: modifyFields(model, {
                lifetime: () => lifetime,
                embedDisposed: () => false,
            }),
        }),

        SelectedRoutingMode: ({ routing }) => ({
            model: modifyFields(model, {
                routing: () => routing,
            }),
        }),

        ClickedDisposeEmbed: () => ({
            model: modifyFields(model, {
                embedDisposed: () => true,
            }),
        }),

        ClickedAdvanceRuntimeLoop: () => ({
            model: modifyFields(model, {
                loopStep: nextLoopStep,
            }),
        }),

        ClickedResetRuntimeLoop: () => ({
            model: modifyFields(model, {
                loopStep: () => 0,
            }),
        }),

        ClickedResetRuntimeDemo: () => ({
            model: demoInit,
        }),
    })

// -----------------------------------------------------------------------------
// Pure visual helpers
// -----------------------------------------------------------------------------

export const ownershipFacts = (
    ownership: OwnershipMode
): ReadonlyArray<readonly [string, string]> =>
    ownership === "Application"
        ? [
              ["constructor", "Runtime.makeApplication"],
              ["view result", "Document"],
              ["owns", "page + document metadata"],
              ["routing", "optional routing config"],
              ["head/html", "title, lang, dir, canonical, og:url"],
          ]
        : [
              ["constructor", "Runtime.makeElement"],
              ["view result", "Html"],
              ["owns", "container only"],
              ["routing", "not available"],
              ["head/html", "never touched"],
          ]

export const lifetimeFacts = (
    model: DemoModel
): ReadonlyArray<readonly [string, string]> =>
    model.lifetime === "Run"
        ? [
              ["starter", "Runtime.run(program)"],
              ["owner", "page lifetime"],
              ["return", "void"],
              ["teardown", "runtime lives with page"],
          ]
        : [
              ["starter", "Runtime.embed(program)"],
              ["owner", "host application"],
              ["return", "EmbedHandle"],
              [
                  "teardown",
                  model.embedDisposed
                      ? "handle.dispose() called"
                      : "host must call handle.dispose()",
              ],
          ]

export const routingFacts = (
    routing: RoutingMode
): ReadonlyArray<readonly [string, string]> =>
    routing === "Off"
        ? [
              ["URL owner", "host/browser"],
              ["init", "init()"],
              ["link handling", "normal browser behavior"],
              ["URL change Message", "none"],
          ]
        : [
              ["URL owner", "Foldkit application"],
              ["init", "init(url)"],
              ["link handling", "onUrlRequest → Message"],
              ["URL change Message", "onUrlChange → Message"],
          ]

export const runtimeLoop = (): ReadonlyArray<
    Readonly<{
        title: string
        detail: string
    }>
> => [
    {
        title: "1 · boot",
        detail: "resolve Flags if present → init → first Model",
    },
    {
        title: "2 · render",
        detail: "view(Model) → DOM / Document",
    },
    {
        title: "3 · event",
        detail: "browser interaction → Message",
    },
    {
        title: "4 · update",
        detail: "Message + Model → next Model + Commands",
    },
    {
        title: "5 · lifecycle",
        detail: "patch DOM · reconcile Subscriptions/ManagedResources · fork Commands",
    },
    {
        title: "6 · results",
        detail: "Command / Subscription result Messages re-enter update",
    },
]
