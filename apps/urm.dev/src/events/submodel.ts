import { Clock, Effect, Option, Schema as S, Struct } from "effect"
import { Command, File, Navigation, Submodel } from "foldkit"
import type { Url } from "foldkit/url"
import { taggedStruct } from "foldkit/schema"
import { defineMessageUnion } from "foldkit/message"
import { Remote, RemoteData, RemoteMutationError } from "foldkit-remote"
import { Surface } from "foldkit-surface"
import * as Events from "@urm/features/events/submodel"
import { EventAction } from "@urm/domain/events"
import {
    EventCatalog,
    EventSummary,
    DomainEvents,
    ChangeEvents,
} from "@urm/contracts/events"
import { ContactsApi, AccountRequestError } from "../contacts/api.ts"

const ui_schema = S.Struct(
    Struct.omit(Events.Model.fields, ["events", "menuItems", "can_write"])
)
const ui_only = (model: Events.ModelType) =>
    Struct.omit(model, ["events", "menuItems", "can_write"])
export const Model = S.Struct({
    ui: ui_schema,
    remote: Remote.Model,
    account_id: S.String,
    domain_id: S.String,
    can_write: S.Boolean,
    epoch: S.Number,
    pending: S.Boolean,
})
export type Model = typeof Model.Type
const Loaded = taggedStruct("EventCatalogLoaded", {
    epoch: S.Number,
    remote: Remote.Model,
    action: S.optional(EventAction),
})
const Saved = taggedStruct("EventCatalogSaved", {
    ...Struct.omit(Loaded.fields, ["_tag", "remote"]),
    settlement: taggedStruct(
        "MutationSucceeded",
        Remote.messages.MutationSucceeded
    ),
})
const Failed = taggedStruct("EventCatalogFailed", {
    epoch: S.Number,
    error: S.String,
})
const Uploaded = taggedStruct("EventImageUploaded", {
    epoch: S.Number,
    url: S.String,
})
export const Refreshed = taggedStruct("EventCatalogRefreshed")
export const Message = S.Union([
    Events.Message,
    Loaded,
    Saved,
    Failed,
    Uploaded,
    Refreshed,
])
export type Message = typeof Message.Type
export type UpdateReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<Message, never, ContactsApi>>,
]
export const init = (pathname: string): Model => ({
    ui: ui_only(Events.init(pathname)[0]),
    remote: Remote.initial,
    account_id: "",
    domain_id: "",
    can_write: false,
    epoch: 0,
    pending: false,
})
export const clear = (model: Model): Model => ({
    ...init("/events"),
    ui: { ...ui_only(Events.init("/events")[0]), route: model.ui.route },
    epoch: model.epoch + 1,
})
const Cache = Surface.application({
    Model: S.Struct({ remote: Remote.Model }),
    Message: defineMessageUnion({ ...Remote.messages }),
    initial: { remote: Remote.initial },
    update: (model: { readonly remote: typeof Remote.Model.Type }) => ({
        model,
    }),
})
export const Data = Remote.make({
    model: Cache.model.remote,
    entities: [EventCatalog],
    queries: [DomainEvents],
    mutations: [ChangeEvents],
})
const query = (domain_id: string) =>
    Data.query(DomainEvents, { domain_id }, { select: EventSummary, first: 1 })
/**
 * The read itself. It used to return `Ready ? items[0] : undefined`, which made
 * a failed read indistinguishable from a domain with no events and discarded
 * the value `Refreshing` and `Failed.previous` still carry. Callers fold the
 * state; `project` below maps it onto the fields the view already renders.
 */
export const library = (model: Model) =>
    query(model.domain_id).read({ remote: model.remote })
export const project = (model: Model): Events.ModelType => {
    const base = { ...model.ui, can_write: model.can_write && !model.pending }
    const none = { events: [], menuItems: [] } as const
    const settled = { loadingEvents: false, loadingMenuItems: false }
    // Generic so the spread keeps every other field of the row; naming the two
    // it rewrites would narrow the element type and drop the rest.
    const menu = <
        T extends {
            readonly price: number
            readonly order_position: number
        },
    >(
        rows: ReadonlyArray<T>
    ) =>
        rows.map((row) => ({
            ...row,
            price: (row.price / 100).toFixed(2),
            order_position: String(row.order_position),
        }))
    return RemoteData.render(library(model), {
        loading: (): Events.ModelType => ({
            ...base,
            ...none,
            loadingEvents: true,
            loadingMenuItems: true,
            error: null,
        }),
        notFound: (): Events.ModelType => ({
            ...base,
            ...none,
            ...settled,
            error: null,
        }),
        // Reaches the view's existing `errorBanner`, which `model.error` fed
        // only for mutations before this.
        failed: (error): Events.ModelType => ({
            ...base,
            ...none,
            ...settled,
            error: error.message,
        }),
        data: (page, freshness): Events.ModelType => {
            const row = page.items[0]
            const refreshing = freshness._tag === "Refreshing"
            return {
                ...base,
                loadingEvents: refreshing,
                loadingMenuItems: refreshing,
                error:
                    freshness._tag === "Stale" ? freshness.error.message : null,
                events: row?.events ?? [],
                menuItems: menu(row?.menu_items ?? []),
            }
        },
    })
}
const LoadEventCatalog = Command.define("LoadEventCatalog", {
    args: {
        account_id: S.String,
        domain_id: S.String,
        epoch: S.Number,
        action: S.optional(EventAction),
    },
    messages: [Loaded, Saved, Failed],
    execute: (args) =>
        Effect.gen(function* () {
            const api = yield* ContactsApi
            if (args.action !== undefined) {
                const request_id = crypto.randomUUID()
                const outcome = yield* Remote.mutate(
                    ChangeEvents,
                    {
                        domain_id: args.domain_id,
                        account_id: args.account_id,
                        action: args.action,
                    },
                    request_id
                ).pipe(Effect.provide(api.remote(args.domain_id)))
                return Saved({
                    epoch: args.epoch,
                    action: args.action,
                    settlement: {
                        _tag: "MutationSucceeded",
                        requestId: request_id,
                        entities: outcome.entities,
                        connections: outcome.connections,
                        now: yield* Clock.currentTimeMillis,
                    },
                })
            }
            const session = yield* api.session()
            if (
                session.account_id !== args.account_id ||
                !session.domains.some(
                    (w) =>
                        w.id === args.domain_id &&
                        (args.action === undefined || w.can_write)
                )
            )
                return yield* Effect.fail(
                    new AccountRequestError({
                        status: 403,
                        message: "Event access changed.",
                    })
                )
            const loaded = yield* Data.prefetch(
                { remote: Remote.initial },
                query(args.domain_id)
            ).pipe(Effect.provide(api.remote(args.domain_id)))
            if (query(args.domain_id).read(loaded)._tag !== "Ready")
                return yield* Effect.fail(
                    new AccountRequestError({
                        status: 503,
                        message: "Events unavailable.",
                    })
                )
            return Loaded({
                epoch: args.epoch,
                remote: loaded.remote,
                action: args.action,
            })
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(
                    Failed({
                        epoch: args.epoch,
                        error:
                            error instanceof RemoteMutationError ||
                            error instanceof AccountRequestError
                                ? error.message
                                : "Could not load events. Check the server connection and retry.",
                    })
                )
            )
        ),
})
const UploadEventImage = Command.define("UploadEventImage", {
    args: {
        account_id: S.String,
        domain_id: S.String,
        epoch: S.Number,
        file: File.File,
    },
    messages: [Uploaded, Failed],
    execute: (args) =>
        Effect.gen(function* () {
            const api = yield* ContactsApi
            const session = yield* api.session()
            if (session.account_id !== args.account_id)
                return yield* Effect.fail(
                    new AccountRequestError({
                        status: 403,
                        message: "Event access changed.",
                    })
                )
            return Uploaded({
                epoch: args.epoch,
                url: yield* api.upload_image(
                    args.domain_id,
                    args.file,
                    "Events"
                ),
            })
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(
                    Failed({
                        epoch: args.epoch,
                        error:
                            error instanceof AccountRequestError
                                ? error.message
                                : "Image upload failed.",
                    })
                )
            )
        ),
})
const NavigateDesktopEvents = Command.define("NavigateDesktopEvents", {
    args: { href: S.String },
    messages: [Events.CompletedNavigateInternal],
    execute: ({ href }) =>
        Navigation.pushUrl(href).pipe(
            Effect.as(Events.CompletedNavigateInternal())
        ),
})
const scope = (model: Model) => ({
    account_id: model.account_id,
    domain_id: model.domain_id,
    epoch: model.epoch,
})
export const synchronize = (
    model: Model,
    account: {
        account_id: string
        domain_id: string
        can_write: boolean
    } | null
): UpdateReturn => {
    if (account === null || account.domain_id === "")
        return [model.domain_id === "" ? model : clear(model), []]
    if (
        model.account_id === account.account_id &&
        model.domain_id === account.domain_id &&
        model.can_write === account.can_write
    )
        return [model, []]
    const next = { ...clear(model), ...account, pending: true }
    return [next, [LoadEventCatalog(scope(next))]]
}
const action_for = (
    command: Command.Command<Events.MessageType>
): Option.Option<EventAction> => {
    const event = S.decodeUnknownOption(
        S.Struct({ id: S.optional(S.String), draft: Events.EventDraft })
    )(command.args)
    const menu = S.decodeUnknownOption(
        S.Struct({ id: S.optional(S.String), draft: Events.MenuItemDraft })
    )(command.args)
    const id = S.decodeUnknownOption(S.Struct({ id: S.String }))(command.args)
    const reorder = S.decodeUnknownOption(
        S.Struct({ category: S.String, ids: S.Array(S.String) })
    )(command.args)
    if (
        (command.name === "CreateEvent" || command.name === "UpdateEvent") &&
        Option.isSome(event)
    ) {
        const { draft } = event.value
        return S.decodeUnknownOption(EventAction)({
            ...draft,
            title: draft.title.trim(),
            venue_name: draft.venue_name.trim(),
            latitude: draft.latitude.trim(),
            longitude: draft.longitude.trim(),
            start_time: draft.start_time.trim(),
            end_time: draft.end_time.trim(),
            _tag:
                command.name === "CreateEvent"
                    ? "create_event"
                    : "update_event",
            id: event.value.id ?? crypto.randomUUID(),
            date: new Date(draft.date).getTime(),
        })
    }
    if (
        (command.name === "CreateMenuItem" ||
            command.name === "UpdateMenuItem") &&
        Option.isSome(menu)
    ) {
        const { draft } = menu.value
        return S.decodeUnknownOption(EventAction)({
            ...draft,
            title: draft.title.trim(),
            category: draft.category.trim(),
            slug: draft.slug.trim(),
            _tag:
                command.name === "CreateMenuItem"
                    ? "create_menu"
                    : "update_menu",
            id: menu.value.id ?? crypto.randomUUID(),
            price: Math.round(Number(draft.price) * 100),
            order_position: Number(draft.order_position),
        })
    }
    if (
        (command.name === "DeleteEvent" || command.name === "DeleteMenuItem") &&
        Option.isSome(id)
    )
        return S.decodeUnknownOption(EventAction)({
            ...id.value,
            _tag:
                command.name === "DeleteEvent" ? "delete_event" : "delete_menu",
        })
    if (command.name === "ReorderMenuItems" && Option.isSome(reorder))
        return S.decodeUnknownOption(EventAction)({
            ...reorder.value,
            _tag: "reorder_menu",
        })
    return Option.none()
}
const apply = (model: Model, message: Events.MessageType): UpdateReturn => {
    const [ui, commands] = Events.update(project(model), message)
    let next = { ...model, ui: ui_only(ui) }
    const translated: Array<Command.Command<Message, never, ContactsApi>> = []
    for (const command of commands) {
        if (command.name === "LoadEvents" || command.name === "LoadMenuItems")
            continue
        if (command.name === "NavigateInternal") {
            const args = S.decodeUnknownOption(S.Struct({ href: S.String }))(
                command.args
            )
            if (Option.isSome(args)) {
                const url = new URL(args.value.href, "http://events.local")
                translated.push(
                    NavigateDesktopEvents({
                        href:
                            url.pathname === "/events" ||
                            url.pathname.startsWith("/events/")
                                ? url.pathname.replace(/\/$/, "")
                                : args.value.href,
                    })
                )
            }
        } else if (command.name === "UploadImage") {
            const args = command.args
            if (model.can_write && S.is(S.Struct({ file: File.File }))(args))
                translated.push(
                    UploadEventImage({ ...scope(model), file: args.file })
                )
            else next = { ...next, ui: { ...next.ui, uploadBusy: false } }
        } else if (
            [
                "CreateEvent",
                "UpdateEvent",
                "DeleteEvent",
                "CreateMenuItem",
                "UpdateMenuItem",
                "DeleteMenuItem",
                "ReorderMenuItems",
            ].includes(command.name)
        ) {
            const action = action_for(command)
            if (model.can_write && !model.pending && Option.isSome(action)) {
                translated.push(
                    LoadEventCatalog({ ...scope(model), action: action.value })
                )
                next = { ...next, pending: true }
            } else
                next = {
                    ...next,
                    ui: {
                        ...next.ui,
                        submitting: false,
                        error: model.can_write
                            ? "Check the event or menu fields."
                            : "This workspace is read-only.",
                    },
                }
        } else translated.push(command)
    }
    return [next, translated]
}
export const update = (
    model: Model,
    message: Message,
    _active_domain_id: Option.Option<string> = Option.none()
): UpdateReturn => {
    if ("epoch" in message && message.epoch !== model.epoch) return [model, []]
    if (message._tag === "EventCatalogRefreshed")
        return model.domain_id === "" || model.pending
            ? [model, []]
            : [{ ...model, pending: true }, [LoadEventCatalog(scope(model))]]
    if (message._tag === "EventCatalogFailed")
        return [
            {
                ...model,
                pending: false,
                ui: {
                    ...model.ui,
                    submitting: false,
                    uploadBusy: false,
                    loadingEvents: false,
                    loadingMenuItems: false,
                    error: message.error,
                },
            },
            [],
        ]
    if (message._tag === "EventImageUploaded")
        return apply(model, Events.UploadedImage({ url: message.url }))
    if (
        message._tag === "EventCatalogLoaded" ||
        message._tag === "EventCatalogSaved"
    ) {
        const next = {
            ...model,
            remote:
                message._tag === "EventCatalogSaved"
                    ? Data.reduce(model, message.settlement).remote
                    : message.remote,
            pending: false,
            ui: {
                ...model.ui,
                loadingEvents: false,
                loadingMenuItems: false,
                submitting: false,
                error: null,
            },
        }
        const action = message.action
        const projected = project(next)
        if (
            action?._tag === "create_event" ||
            action?._tag === "update_event"
        ) {
            const event = projected.events.find((row) => row.id === action.id)
            if (event)
                return apply(
                    next,
                    action._tag === "create_event"
                        ? Events.EventCreated({ event })
                        : Events.EventUpdated({ event })
                )
        }
        if (action?._tag === "create_menu" || action?._tag === "update_menu") {
            const menuItem = projected.menuItems.find(
                (row) => row.id === action.id
            )
            if (menuItem)
                return apply(
                    next,
                    action._tag === "create_menu"
                        ? Events.MenuItemCreated({ menuItem })
                        : Events.MenuItemUpdated({ menuItem })
                )
        }
        return apply(
            next,
            Events.EventsSnapshotLoaded({
                events: projected.events,
                menuItems: projected.menuItems,
            })
        )
    }
    if (
        message._tag === "EventsSnapshotLoaded" ||
        message._tag === "EventsLoaded" ||
        message._tag === "MenuItemsLoaded"
    )
        return [model, []]
    return apply(model, message)
}
export const changed_url = (
    model: Model,
    url: Url,
    pathname: string,
    active_domain_id: Option.Option<string>
): UpdateReturn =>
    update(
        model,
        Events.ChangedUrl({ url: { ...url, pathname } }),
        active_domain_id
    )
export const subscriptions = Events.subscriptions
export const view = Submodel.defineView<Model, Message>((model, h) =>
    h.div(
        [],
        [
            h.button(
                [
                    h.Type("button"),
                    h.Disabled(model.pending),
                    h.OnClick(Refreshed()),
                ],
                [model.ui.error === null ? "Refresh events" : "Retry events"]
            ),
            h.div(
                [],
                [
                    h.submodel({
                        slotId: "events-ui",
                        model: project(model),
                        view: Events.view,
                        toParentMessage: (message) => message,
                    }),
                ]
            ),
        ]
    )
)
