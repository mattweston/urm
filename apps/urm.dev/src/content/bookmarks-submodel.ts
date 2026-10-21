import { Array, Effect, Option, Schema as S, Struct } from "effect"
import { Command, Submodel } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { taggedStruct } from "foldkit/schema"
import { Remote } from "foldkit-remote"
import { Surface } from "foldkit-surface"
import * as Bookmarks from "@urm/features/content/bookmarks"
import {
    BookmarkFields,
    BookmarkCatalog,
    BookmarkCatalogSummary,
    DomainBookmarks,
    ChangeBookmarks,
} from "@urm/contracts/bookmarks"
import { ContactsApi, AccountRequestError } from "../contacts/api.ts"

const ui_schema = S.Struct(
    Struct.omit(Bookmarks.Model.fields, ["bookmarks", "can_write"])
)
const ui_only = (model: Bookmarks.ModelType) =>
    Struct.omit(model, ["bookmarks", "can_write"])
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
const Loaded = taggedStruct("BookmarksLoaded", {
    epoch: S.Number,
    remote: Remote.Model,
    result: S.NullOr(S.Literals(["saved", "deleted"])),
})
const Saved = taggedStruct("BookmarksSaved", {
    ...Struct.omit(Loaded.fields, ["_tag", "remote"]),
    settlement: taggedStruct(
        "MutationSucceeded",
        Remote.messages.MutationSucceeded
    ),
})
const Failed = taggedStruct("BookmarksFailed", {
    epoch: S.Number,
    error: S.String,
})
const Refreshed = taggedStruct("BookmarksRefreshed")
export const Message = S.Union([
    Bookmarks.Message,
    Loaded,
    Saved,
    Failed,
    Refreshed,
])
export type Message = typeof Message.Type
export type UpdateReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<Message, never, ContactsApi>>,
]
const CacheModel = S.Struct({ remote: Remote.Model })
const Cache = Surface.application({
    Model: CacheModel,
    Message: defineMessageUnion({ ...Remote.messages }),
    initial: { remote: Remote.initial },
    update: (model: typeof CacheModel.Type) => ({ model }),
})
export const Data = Remote.make({
    model: Cache.model.remote,
    entities: [BookmarkCatalog],
    queries: [DomainBookmarks],
    mutations: [ChangeBookmarks],
})
const query = (domain_id: string) =>
    Data.query(
        DomainBookmarks,
        { domain_id },
        { select: BookmarkCatalogSummary, first: 1 }
    )
export const project = (model: Model): Bookmarks.ModelType => {
    const result = query(model.domain_id).read({ remote: model.remote })
    return {
        ...model.ui,
        bookmarks:
            result._tag === "Ready"
                ? (result.value.items[0]?.bookmarks ?? [])
                : [],
        can_write: model.can_write && !model.pending,
    }
}
export const init = (): Model => ({
    ui: ui_only(Bookmarks.init()[0]),
    remote: Remote.initial,
    account_id: "",
    domain_id: "",
    can_write: false,
    epoch: 0,
    pending: false,
})
export const clear = (model: Model): Model => ({
    ...init(),
    epoch: model.epoch + 1,
})
const scope_fields = {
    account_id: S.String,
    domain_id: S.String,
    epoch: S.Number,
}
const check_session = Effect.fn("Bookmarks.checkSession")(function* (
    account_id: string,
    domain_id: string,
    write: boolean
) {
    const api = yield* ContactsApi
    const session = yield* api.session()
    if (
        session.account_id !== account_id ||
        !session.domains.some(
            (workspace) =>
                workspace.id === domain_id && (!write || workspace.can_write)
        )
    )
        return yield* Effect.fail(
            new AccountRequestError({
                status: 403,
                message: "Bookmark access changed. Sign in or refresh.",
            })
        )
    return api
})
const read_catalog = Effect.fn("Bookmarks.read")(function* (domain_id: string) {
    const api = yield* ContactsApi
    const loaded = yield* Data.prefetch(
        { remote: Remote.initial },
        query(domain_id)
    ).pipe(Effect.provide(api.remote(domain_id)))
    if (query(domain_id).read(loaded)._tag !== "Ready")
        return yield* Effect.fail(
            new AccountRequestError({
                status: 403,
                message:
                    "Bookmarks could not be loaded. Check workspace access and refresh.",
            })
        )
    return loaded.remote
})
const LoadBookmarkCatalog = Command.define("LoadBookmarkCatalog", {
    args: scope_fields,
    messages: [Loaded, Failed],
    execute: ({ account_id, domain_id, epoch }) =>
        Effect.gen(function* () {
            yield* check_session(account_id, domain_id, false)
            return Loaded({
                epoch,
                remote: yield* read_catalog(domain_id),
                result: null,
            })
        }).pipe(
            Effect.catch(() =>
                Effect.succeed(
                    Failed({
                        epoch,
                        error: "Bookmarks could not be loaded. Check workspace access and refresh.",
                    })
                )
            )
        ),
})
const SaveCatalogBookmark = Command.define("SaveCatalogBookmark", {
    args: {
        ...scope_fields,
        bookmark_id: S.NullOr(S.String),
        title: S.String,
        href: S.String,
        tags: S.Array(S.String),
    },
    messages: [Saved, Failed],
    execute: ({ account_id, domain_id, epoch, bookmark_id, ...fields }) =>
        Effect.gen(function* () {
            const validated =
                yield* S.decodeUnknownEffect(BookmarkFields)(fields)
            const api = yield* ContactsApi
            const id = bookmark_id ?? crypto.randomUUID()
            const request_id = crypto.randomUUID()
            const outcome = yield* Remote.mutate(
                ChangeBookmarks,
                {
                    domain_id,
                    account_id,
                    action: {
                        _tag: bookmark_id === null ? "create" : "update",
                        id,
                        ...validated,
                    },
                },
                request_id
            ).pipe(Effect.provide(api.remote(domain_id)))
            return Saved({
                epoch,
                settlement: {
                    _tag: "MutationSucceeded",
                    requestId: request_id,
                    entities: outcome.entities,
                    connections: outcome.connections,
                },
                result: "saved",
            })
        }).pipe(
            Effect.catch(() =>
                Effect.succeed(
                    Failed({
                        epoch,
                        error: "Bookmark could not be saved. Check field lengths and duplicate URLs, or refresh before retrying.",
                    })
                )
            )
        ),
})
const DeleteCatalogBookmark = Command.define("DeleteCatalogBookmark", {
    args: { ...scope_fields, bookmark_id: S.String },
    messages: [Saved, Failed],
    execute: ({ account_id, domain_id, epoch, bookmark_id }) =>
        Effect.gen(function* () {
            const api = yield* ContactsApi
            const request_id = crypto.randomUUID()
            const outcome = yield* Remote.mutate(
                ChangeBookmarks,
                {
                    domain_id,
                    account_id,
                    action: { _tag: "delete", id: bookmark_id },
                },
                request_id
            ).pipe(Effect.provide(api.remote(domain_id)))
            return Saved({
                epoch,
                settlement: {
                    _tag: "MutationSucceeded",
                    requestId: request_id,
                    entities: outcome.entities,
                    connections: outcome.connections,
                },
                result: "deleted",
            })
        }).pipe(
            Effect.catch(() =>
                Effect.succeed(
                    Failed({
                        epoch,
                        error: "Bookmark deletion could not be confirmed. Refresh before retrying.",
                    })
                )
            )
        ),
})
const SaveArgs = S.Struct({
    bookmark_id: S.NullOr(S.String),
    title: S.String,
    href: S.String,
    tags: S.Array(S.String),
})
const DeleteArgs = S.Struct({ bookmark_id: S.String })
const translate = (
    model: Model,
    command: Command.Command<Bookmarks.MessageType>
): UpdateReturn[1] => {
    const scope = {
        account_id: model.account_id,
        domain_id: model.domain_id,
        epoch: model.epoch,
    }
    if (command.name === "SaveBookmark" && S.is(SaveArgs)(command.args))
        return [SaveCatalogBookmark({ ...scope, ...command.args })]
    if (command.name === "DeleteBookmark" && S.is(DeleteArgs)(command.args))
        return [DeleteCatalogBookmark({ ...scope, ...command.args })]
    return [command]
}
export const synchronize = (
    model: Model,
    scope: { account_id: string; domain_id: string; can_write: boolean } | null
): UpdateReturn => {
    if (scope === null || scope.domain_id === "")
        return [model.domain_id === "" ? model : clear(model), []]
    if (
        scope.account_id === model.account_id &&
        scope.domain_id === model.domain_id &&
        scope.can_write === model.can_write
    )
        return [model, []]
    const next = { ...clear(model), ...scope, pending: true }
    return [next, [LoadBookmarkCatalog({ ...scope, epoch: next.epoch })]]
}
export const update = (model: Model, message: Message): UpdateReturn => {
    if ("epoch" in message && message.epoch !== model.epoch) return [model, []]
    if (
        message._tag === "BookmarksLoaded" ||
        message._tag === "BookmarksSaved"
    ) {
        const next: Model = {
            ...model,
            remote:
                message._tag === "BookmarksSaved"
                    ? Data.reduce(model, message.settlement).remote
                    : message.remote,
            pending: false,
            ui: { ...model.ui, status: "ready", error: Option.none() },
        }
        if (message.result === null) return [next, []]
        const [ui, commands] = Bookmarks.update(project(next), {
            _tag: "ClickedCancelBookmark",
        })
        const completed = { ...next, ui: ui_only(ui) }
        return [
            completed,
            Array.flatMap(commands, (command) => translate(completed, command)),
        ]
    }
    if (message._tag === "BookmarksFailed")
        return [
            {
                ...model,
                pending: false,
                ui: {
                    ...model.ui,
                    status: "error",
                    error: Option.some(message.error),
                },
            },
            [],
        ]
    if (message._tag === "BookmarksRefreshed")
        return model.pending || model.domain_id === ""
            ? [model, []]
            : [
                  { ...model, pending: true },
                  [
                      LoadBookmarkCatalog({
                          account_id: model.account_id,
                          domain_id: model.domain_id,
                          epoch: model.epoch,
                      }),
                  ],
              ]
    if (
        ["LoadedBookmarks", "SavedBookmark", "DeletedBookmark"].includes(
            message._tag
        )
    )
        return [model, []]
    if (
        (!model.can_write || model.pending) &&
        [
            "SubmittedBookmark",
            "ClickedEditBookmark",
            "ClickedDeleteBookmark",
        ].includes(message._tag)
    )
        return [model, []]
    const [ui, commands] = Bookmarks.update(project(model), message)
    const next = { ...model, ui: ui_only(ui) }
    const translated = Array.flatMap(commands, (command) =>
        translate(next, command)
    )
    return [
        {
            ...next,
            pending:
                model.pending ||
                translated.some((command) =>
                    ["SaveCatalogBookmark", "DeleteCatalogBookmark"].includes(
                        command.name
                    )
                ),
        },
        translated,
    ]
}
export const link_suggestions = Bookmarks.linkSuggestions
export const view = Submodel.defineView<Model, Message>((model, h) =>
    h.div(
        [],
        [
            h.button(
                [
                    h.Type("button"),
                    h.Disabled(model.pending),
                    h.OnClick(Refreshed()),
                    h.Class("text-sm underline"),
                ],
                ["Refresh"]
            ),
            ...(!model.can_write ? [h.p([], ["Read-only access"])] : []),
            Bookmarks.view(project(model), (message) => message, h),
        ]
    )
)
