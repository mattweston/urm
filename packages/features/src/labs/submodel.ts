import { Match as M, Schema as S } from "effect"
import { Command, Submodel } from "foldkit"
import { type Html, type HtmlBuilder } from "foldkit/html"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"

import * as Landing from "../marketing/landing/index.ts"
import { view as charts_view } from "./charts/view.ts"
import * as Mailroom from "./mailroom/index.ts"

export const LabsHomeRoute = taggedStruct("LabsHome")
export const LabsChartsRoute = taggedStruct("LabsCharts")
export const LabsDocumentsLandingRoute = taggedStruct("LabsDocumentsLanding")
export const LabsMailRoute = taggedStruct("LabsMail", { path: S.String })
export const LabsNotFoundRoute = taggedStruct("LabsNotFound", {
    path: S.String,
})

export const LabsRoute = S.Union([
    LabsHomeRoute,
    LabsChartsRoute,
    LabsDocumentsLandingRoute,
    LabsMailRoute,
    LabsNotFoundRoute,
])
export type LabsRoute = typeof LabsRoute.Type

export const Model = S.Struct({
    route: LabsRoute,
    landing: Landing.Model,
    mailroom: Mailroom.Model,
    mailroom_initialized: S.Boolean,
})
export type Model = typeof Model.Type

export const ChangedPath = taggedStruct("ChangedPath", { pathname: S.String })
export const GotLandingMessage = taggedStruct("GotLandingMessage", {
    message: Landing.Message,
})
export const GotMailroomMessage = taggedStruct("GotMailroomMessage", {
    message: Mailroom.Message,
})
export const CompletedNavigation = taggedStruct("CompletedNavigation")
export const Message = S.Union([
    ChangedPath,
    GotLandingMessage,
    GotMailroomMessage,
    CompletedNavigation,
])
export type Message = typeof Message.Type

export type UpdateReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<Message>>,
]

export const labsHref = () => "/"
export const labsChartsHref = () => "/stats/charts/"
export const labsDocumentsLandingHref = () => Landing.landingEditorHref()
export const labsMailInboxHref = () => Mailroom.mailroomHref()

export const isAppScope = (pathname: string): boolean =>
    pathname === "/" || pathname.startsWith("/")

const route_for_path = (pathname: string): LabsRoute => {
    const path = pathname.replace(/\/$/, "")

    if (path === "/") {
        return LabsHomeRoute()
    }
    if (path === "/stats/charts" || path === "/charts") {
        return LabsChartsRoute()
    }
    if (Landing.isLandingEditorPath(path)) {
        return LabsDocumentsLandingRoute()
    }
    if (Mailroom.isAppScope(path)) {
        return LabsMailRoute({ path })
    }
    return LabsNotFoundRoute({ path })
}

const mailroom_for_path = (
    model: Mailroom.ModelType,
    pathname: string
): Mailroom.ModelType => {
    const draft_id = Mailroom.draftIdForPath(pathname)
    const routed_model =
        draft_id === undefined ? model : Mailroom.openDraft(model, draft_id)

    return { ...routed_model, view_path: pathname }
}

export const init = (pathname: string): UpdateReturn => {
    const route = route_for_path(pathname)
    const [landing, commands] = Landing.init()
    const [initial_mailroom, mailroom_commands] =
        route._tag === "LabsMail" ? Mailroom.init() : Mailroom.initDeferred()
    const mailroom = mailroom_for_path(initial_mailroom, pathname)

    return [
        Model.make({
            route,
            landing,
            mailroom,
            mailroom_initialized: route._tag === "LabsMail",
        }),
        [
            ...Command.mapMessages(commands, (message) =>
                GotLandingMessage({ message })
            ),
            ...Command.mapMessages(mailroom_commands, (message) =>
                GotMailroomMessage({ message })
            ),
        ],
    ]
}

export const changed_path = (model: Model, pathname: string): UpdateReturn =>
    update(model, ChangedPath({ pathname }))

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ChangedPath: ({ pathname }) => {
                const route = route_for_path(pathname)
                if (route._tag === "LabsMail" && !model.mailroom_initialized) {
                    const [mailroom, commands] = Mailroom.init()
                    return [
                        modifyFields(model, {
                            route: () => route,
                            mailroom: () =>
                                mailroom_for_path(mailroom, pathname),
                            mailroom_initialized: () => true,
                        }),
                        Command.mapMessages(commands, (message) =>
                            GotMailroomMessage({ message })
                        ),
                    ]
                }

                return [
                    modifyFields(model, {
                        route: () => route,
                        mailroom: (mailroom) =>
                            route._tag === "LabsMail"
                                ? mailroom_for_path(mailroom, pathname)
                                : mailroom,
                    }),
                    [],
                ]
            },
            GotLandingMessage: ({ message }) => {
                const [landing, commands] = Landing.update(
                    model.landing,
                    message
                )

                return [
                    modifyFields(model, { landing: () => landing }),
                    Command.mapMessages(commands, (message) =>
                        GotLandingMessage({ message })
                    ),
                ]
            },
            GotMailroomMessage: ({ message }) => {
                const [mailroom, commands] = Mailroom.update(
                    model.mailroom,
                    message
                )

                return [
                    modifyFields(model, { mailroom: () => mailroom }),
                    Command.mapMessages(commands, (message) =>
                        GotMailroomMessage({ message })
                    ),
                ]
            },
            CompletedNavigation: () => [model, []],
        })
    )

const home_view = (h: HtmlBuilder<Message>): Html =>
    h.div(
        [h.Class("flex min-h-0 flex-col gap-6")],
        [
            h.div(
                [h.Class("space-y-1")],
                [
                    h.h2(
                        [h.Class("text-2xl font-semibold tracking-tight")],
                        ["Labs"]
                    ),
                    h.p(
                        [h.Class("max-w-2xl text-sm text-muted-foreground")],
                        [
                            "Isolated prototypes and visual experiments that are not part of the production reporting surface.",
                        ]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href(labsChartsHref()),
                    h.Class(
                        "block rounded-[var(--radius-surface)] border-(length:--surface-border-width) bg-card p-6 text-card-foreground [box-shadow:var(--shadow-surface)] transition-colors hover:bg-muted/40"
                    ),
                ],
                [
                    h.h3([h.Class("font-semibold")], ["Chart prototypes"]),
                    h.p(
                        [h.Class("mt-1 text-sm text-muted-foreground")],
                        [
                            "Area, bar, line, and timeseries treatments using illustrative data.",
                        ]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href(labsDocumentsLandingHref()),
                    h.Class(
                        "block rounded-[var(--radius-surface)] border-(length:--surface-border-width) bg-card p-6 text-card-foreground [box-shadow:var(--shadow-surface)] transition-colors hover:bg-muted/40"
                    ),
                ],
                [
                    h.h3([h.Class("font-semibold")], ["Editable landing"]),
                    h.p(
                        [h.Class("mt-1 text-sm text-muted-foreground")],
                        [
                            "Inline landing-page copy editing with preview, save, and cancel states.",
                        ]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href(labsMailInboxHref()),
                    h.Class(
                        "block rounded-[var(--radius-surface)] border-(length:--surface-border-width) bg-card p-6 text-card-foreground [box-shadow:var(--shadow-surface)] transition-colors hover:bg-muted/40"
                    ),
                ],
                [
                    h.h3([h.Class("font-semibold")], ["Mail inbox"]),
                    h.p(
                        [h.Class("mt-1 text-sm text-muted-foreground")],
                        [
                            "Local-first inbox, message, folder, and compose experiments.",
                        ]
                    ),
                ]
            ),
        ]
    )

const landing_view = Submodel.defineView<
    Landing.ModelType,
    Landing.MessageType
>((model, h) => Landing.view(model, (message) => message, h))

const not_found_view = (path: string, h: HtmlBuilder<Message>): Html =>
    h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border border-dashed border-border p-8 text-center"
            ),
        ],
        [
            h.h2([h.Class("text-xl font-semibold")], ["Lab not found"]),
            h.p(
                [h.Class("mt-2 text-sm text-muted-foreground")],
                [`No experiment is registered for ${path}.`]
            ),
            h.a(
                [
                    h.Href(labsHref()),
                    h.Class("mt-4 inline-flex text-sm font-medium underline"),
                ],
                ["Return to Labs"]
            ),
        ]
    )

const content_view = (model: Model, h: HtmlBuilder<Message>): Html => {
    const content = M.value(model.route).pipe(
        M.withReturnType<Html>(),
        M.tagsExhaustive({
            LabsHome: () => home_view(h),
            LabsCharts: charts_view,
            LabsDocumentsLanding: () =>
                h.submodel({
                    slotId: "labs-documents-landing",
                    model: model.landing,
                    view: landing_view,
                    toParentMessage: (message) =>
                        GotLandingMessage({ message }),
                }),
            LabsMail: ({ path }) =>
                h.submodel({
                    slotId: "labs-mail-inbox",
                    model: model.mailroom,
                    view: Mailroom.view,
                    viewInputs: {
                        route: Mailroom.viewRouteForPath(path),
                        folderHref: (folder) => `/mail/${folder}/`,
                        composeHref: (draft_id = "new") =>
                            `/mail/compose/${draft_id}/`,
                        messageHref: (folder, message_id) =>
                            `/mail/${folder}/${message_id}/`,
                        internalNavigation: true,
                    },
                    toParentMessage: (message) =>
                        GotMailroomMessage({ message }),
                }),
            LabsNotFound: ({ path }) => not_found_view(path, h),
        })
    )

    return h.keyed("div")(
        model.route._tag,
        [h.Class("mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8")],
        [content]
    )
}

export const view = Submodel.defineView<Model, Message>(content_view)
