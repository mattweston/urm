import { Array, Effect, Schema as S, Struct } from "effect"
import { Command, Submodel } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { taggedStruct } from "foldkit/schema"
import { Remote, RemoteData } from "foldkit-remote"
import { Surface } from "foldkit-surface"
import * as Tags from "@urm/features/tags/submodel"
import {
    ChangeTags,
    DomainTags,
    TagAction,
    TagFields,
    TagCatalog,
    TagCatalogSummary,
} from "@urm/contracts/tags"
import { ContactsApi, AccountRequestError } from "../contacts/api.ts"

const ui_schema = S.Struct(
    Struct.omit(Tags.Model.fields, ["tags", "entityTags", "can_write"])
)
const ui_only = (model: Tags.ModelType) =>
    Struct.omit(model, ["tags", "entityTags", "can_write"])
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
const Loaded = taggedStruct("TagsLoaded", {
    epoch: S.Number,
    remote: Remote.Model,
    result: S.NullOr(Tags.Message),
})
const Saved = taggedStruct("TagsSaved", {
    ...Struct.omit(Loaded.fields, ["_tag", "remote"]),
    settlement: taggedStruct(
        "MutationSucceeded",
        Remote.messages.MutationSucceeded
    ),
})
const Failed = taggedStruct("TagsFailed", { epoch: S.Number, error: S.String })
const Refreshed = taggedStruct("TagsRefreshed")
export const Message = S.Union([Tags.Message, Loaded, Saved, Failed, Refreshed])
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
    entities: [TagCatalog],
    queries: [DomainTags],
    mutations: [ChangeTags],
})
const query = (domain_id: string) => Data.get(TagCatalogSummary, domain_id)
/**
 * Projects the read into the feature's UI model, carrying every `RemoteData`
 * state rather than `Ready`-or-nothing.
 *
 * Collapsing to `Ready ? value : undefined` lost three things. A `Failed` read
 * rendered as an empty catalogue, so a dropped request was indistinguishable
 * from a domain with no tags and the error never reached the view. `Refreshing`
 * carries the previous value, which was thrown away, so the list blanked on
 * every refresh. And `Failed` carries `previous`, the last known good value,
 * which `render` keeps showing alongside the error instead of discarding.
 */
export const project = (model: Model): Tags.ModelType => {
    const result = query(model.domain_id).read({ remote: model.remote })
    const base = { ...model.ui, can_write: model.can_write && !model.pending }
    const none = { tags: [], entityTags: [] } as const
    return RemoteData.render(result, {
        loading: (): Tags.ModelType => ({
            ...base,
            ...none,
            loading: true,
            error: null,
        }),
        // A domain with no catalogue row, which is not an empty catalogue: the
        // view may say so where it would otherwise show an empty list.
        notFound: (): Tags.ModelType => ({
            ...base,
            ...none,
            loading: false,
            error: null,
        }),
        failed: (error): Tags.ModelType => ({
            ...base,
            ...none,
            loading: false,
            error: error.message,
        }),
        data: (catalog, freshness): Tags.ModelType => ({
            ...base,
            tags: catalog.tags,
            entityTags: catalog.entity_tags,
            loading: freshness._tag === "Refreshing",
            // `Stale` means this value is the last good one and the newest read
            // failed; show both rather than silently serving stale data.
            error:
                freshness._tag === "Stale" ? freshness.error.message : null,
        }),
    })
}
export const init = (): Model => ({
    ui: ui_only(Tags.init()[0]),
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
const check_session = Effect.fn("Tags.checkSession")(function* (
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
                message: "Tag access changed. Sign in or refresh.",
            })
        )
    return api
})
const LoadTagCatalog = Command.define("LoadTagCatalog", {
    args: scope_fields,
    messages: [Loaded, Saved, Failed],
    execute: ({ account_id, domain_id, epoch }) =>
        Effect.gen(function* () {
            const api = yield* check_session(account_id, domain_id, false)
            const request_id = crypto.randomUUID()
            const outcome = yield* Remote.mutate(
                ChangeTags,
                { domain_id, account_id, action: { _tag: "sync_directory" } },
                request_id
            ).pipe(Effect.provide(api.remote(domain_id)))
            return Loaded({
                epoch,
                remote: Data.reduce(
                    { remote: Remote.initial },
                    {
                        _tag: "MutationSucceeded",
                        requestId: request_id,
                        entities: outcome.entities,
                        connections: outcome.connections,
                    }
                ).remote,
                result: null,
            })
        }).pipe(
            Effect.catch(() =>
                Effect.succeed(
                    Failed({
                        epoch,
                        error: "Tags could not be loaded. Check workspace access and refresh.",
                    })
                )
            )
        ),
})
const ChangeTagCatalog = Command.define("ChangeTagCatalog", {
    args: { ...scope_fields, action: TagAction, success: Tags.Message },
    messages: [Saved, Failed],
    execute: ({ account_id, domain_id, epoch, action, success }) =>
        Effect.gen(function* () {
            const api = yield* ContactsApi
            const request_id = crypto.randomUUID()
            const outcome = yield* Remote.mutate(
                ChangeTags,
                { domain_id, account_id, action },
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
                result: success,
            })
        }).pipe(
            Effect.catch(() =>
                Effect.succeed(
                    Failed({
                        epoch,
                        error: "Tag change could not be confirmed. Check for a duplicate name or refresh before retrying.",
                    })
                )
            )
        ),
})
const CreateCatalogTag = Command.define("CreateCatalogTag", {
    args: { ...scope_fields, fields: TagFields },
    messages: [Loaded, Saved, Failed],
    execute: ({ fields, ...scope }) =>
        ChangeTagCatalog({
            ...scope,
            action: { _tag: "create", id: crypto.randomUUID(), ...fields },
            success: Tags.CreatedTag(),
        }).effect,
})
const ModelArgs = S.Struct({ model: Tags.Model })
const DeleteArgs = S.Struct({ tagId: S.String })
const color = (value: string) =>
    Tags.TAG_COLOR_OPTIONS.some((option) => option.value === value)
        ? value
        : Tags.DEFAULT_TAG_COLOR
const translate = (
    model: Model,
    command: Command.Command<Tags.MessageType>
): UpdateReturn[1] => {
    const scope = {
        account_id: model.account_id,
        domain_id: model.domain_id,
        epoch: model.epoch,
    }
    const args = command.args
    if (command.name === "LoadTags" || command.name === "SyncDirectoryTags")
        return []
    if (command.name === "CreateTag" && S.is(ModelArgs)(args))
        return [
            CreateCatalogTag({
                ...scope,
                fields: {
                    name: args.model.creatingName.trim(),
                    color: color(args.model.creatingColor),
                    description: args.model.creatingDescription.trim() || null,
                },
            }),
        ]
    if (
        command.name === "SaveTagEdits" &&
        S.is(ModelArgs)(args) &&
        args.model.editingTagId !== null
    )
        return [
            ChangeTagCatalog({
                ...scope,
                action: {
                    _tag: "update",
                    id: args.model.editingTagId,
                    name: args.model.editingName.trim(),
                    color: color(args.model.editingColor),
                    description: args.model.editingDescription.trim() || null,
                },
                success: Tags.SavedTagEdits(),
            }),
        ]
    if (command.name === "DeleteTag" && S.is(DeleteArgs)(args))
        return [
            ChangeTagCatalog({
                ...scope,
                action: { _tag: "delete", id: args.tagId },
                success: Tags.DeletedTag({ tagId: args.tagId }),
            }),
        ]
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
    return [next, [LoadTagCatalog({ ...scope, epoch: next.epoch })]]
}
export const update = (model: Model, message: Message): UpdateReturn => {
    if ("epoch" in message && message.epoch !== model.epoch) return [model, []]
    if (message._tag === "TagsLoaded" || message._tag === "TagsSaved") {
        const next = {
            ...model,
            remote:
                message._tag === "TagsSaved"
                    ? Data.reduce(model, message.settlement).remote
                    : message.remote,
            pending: false,
            ui: {
                ...model.ui,
                loading: false,
                mutating: false,
                directoryTagsSynced: true,
                error: null,
            },
        }
        if (message.result === null) return [next, []]
        const [ui, commands] = Tags.update(project(next), message.result)
        const completed = { ...next, ui: ui_only(ui) }
        return [
            completed,
            Array.flatMap(commands, (command) => translate(completed, command)),
        ]
    }
    if (message._tag === "TagsFailed")
        return [
            {
                ...model,
                pending: false,
                ui: {
                    ...model.ui,
                    loading: false,
                    mutating: false,
                    error: message.error,
                },
            },
            [],
        ]
    if (message._tag === "TagsRefreshed")
        return model.pending || model.domain_id === ""
            ? [model, []]
            : [
                  { ...model, pending: true },
                  [
                      LoadTagCatalog({
                          account_id: model.account_id,
                          domain_id: model.domain_id,
                          epoch: model.epoch,
                      }),
                  ],
              ]
    if (
        [
            "LoadedTags",
            "CreatedTag",
            "SavedTagEdits",
            "DeletedTag",
            "SyncedDirectoryTags",
        ].includes(message._tag)
    )
        return [model, []]
    if (
        (!model.can_write || model.pending) &&
        [
            "ClickedCreateTag",
            "OpenedTagEditor",
            "ClickedSaveTagEdits",
            "ClickedDeleteTag",
            "ConfirmedDeleteTag",
        ].includes(message._tag)
    )
        return [model, []]
    const [ui, commands] = Tags.update(project(model), message)
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
                    ["ChangeTagCatalog", "CreateCatalogTag"].includes(
                        command.name
                    )
                ),
        },
        translated,
    ]
}
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
            h.submodel({
                slotId: "tag-catalog",
                model: project(model),
                view: Tags.view,
                toParentMessage: (message) => message,
            }),
        ]
    )
)
