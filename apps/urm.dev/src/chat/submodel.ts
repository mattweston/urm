import {
    Effect,
    Function,
    Option,
    Schedule,
    Schema as S,
    Stream,
    Struct,
} from "effect"
import { Command, Submodel, Subscription } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { defineMessageUnion } from "foldkit/message"
import { Remote } from "foldkit-remote"
import { Surface } from "foldkit-surface"
import {
    ChatCatalog,
    ChatSummary,
    SendChat,
    ChatRemote,
} from "@urm/contracts/chat"
import { chat_catalog_id, SendChatInput } from "@urm/domain/chat"
import { ContactsApi } from "../contacts/api.ts"
import * as Chat from "./chat-ui.ts"
const ui_fields = Struct.omit(Chat.Model.fields, [
    "messages",
    "admins",
    "can_send",
    "status",
])
const ui_only = (model: Chat.Model) =>
    Struct.omit(model, ["messages", "admins", "can_send", "status"])
export const Model = S.Struct({
    ui: S.Struct(ui_fields),
    remote: Remote.Model,
    account_id: S.String,
    domain_id: S.String,
    can_access: S.Boolean,
    epoch: S.Number,
    generation: S.Number,
    loading: S.Boolean,
    loaded: S.Boolean,
    send_id: S.String,
})
export type Model = typeof Model.Type
const scope_fields = {
    account_id: S.String,
    domain_id: S.String,
    epoch: S.Number,
    generation: S.Number,
}
const Loaded = taggedStruct("ChatLoaded", {
    epoch: S.Number,
    generation: S.Number,
    remote: Remote.Model,
})
const LoadFailed = taggedStruct("ChatLoadFailed", {
    epoch: S.Number,
    generation: S.Number,
})
const Prepared = taggedStruct("ChatSendPrepared", {
    epoch: S.Number,
    generation: S.Number,
    message: SendChatInput,
})
export const Saved = taggedStruct("ChatSaved", {
    epoch: S.Number,
    generation: S.Number,
    message: ChatRemote.Message,
})
const Polled = taggedStruct("ChatPolled", { epoch: S.Number })
export const Refreshed = taggedStruct("ChatRefreshed")
export const Message = S.Union([
    Chat.Message,
    Loaded,
    LoadFailed,
    Prepared,
    Saved,
    Polled,
    Refreshed,
])
export type Message = typeof Message.Type
export type UpdateReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<Message, never, ContactsApi>>,
]
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
    entities: [ChatCatalog],
    mutations: [SendChat],
})
const query = (model: Pick<Model, "domain_id" | "account_id">) =>
    Data.get(ChatSummary, chat_catalog_id(model.domain_id, model.account_id))
export const library = Function.memoize((model: Model) => {
    const result = query(model).read(model)
    return result._tag === "Ready" ? (result.value ?? null) : null
})
export const project = Function.memoize(
    (model: Model): Chat.Model => ({
        ...model.ui,
        messages: library(model)?.messages ?? [],
        admins: library(model)?.admins ?? [],
        // Composing follows administrator access alone, as the retained route
        // did. A pending or failed catalog load reports itself in `status`
        // instead of disabling the composer.
        can_send: model.can_access,
        status: !model.can_access
            ? "Administrator access required"
            : !model.loaded
              ? model.loading
                  ? "Loading chat"
                  : "Chat unavailable — refresh to retry"
              : "Messages refresh automatically",
    })
)
export const init = (): Model => ({
    ui: ui_only(Chat.init()),
    remote: Remote.initial,
    account_id: "",
    domain_id: "",
    can_access: false,
    epoch: 0,
    generation: 0,
    loading: false,
    loaded: false,
    send_id: "",
})
export const clear = (model: Model): Model => ({
    ...init(),
    epoch: model.epoch + 1,
})
export const synchronize = (
    model: Model,
    scope: { account_id: string; domain_id: string; can_write: boolean } | null
): Model => {
    if (scope === null || scope.domain_id === "")
        return model.domain_id === "" ? model : clear(model)
    if (
        model.account_id === scope.account_id &&
        model.domain_id === scope.domain_id &&
        model.can_access === scope.can_write
    )
        return model
    return {
        ...clear(model),
        account_id: scope.account_id,
        domain_id: scope.domain_id,
        can_access: scope.can_write,
    }
}
const scope = (model: Model) => ({
    account_id: model.account_id,
    domain_id: model.domain_id,
    epoch: model.epoch,
    generation: model.generation,
})
const LoadChat = Command.define("LoadChat", {
    args: scope_fields,
    messages: [Loaded, LoadFailed],
    execute: (args) =>
        Effect.gen(function* () {
            const api = yield* ContactsApi
            const result = yield* Data.prefetch(
                { remote: Remote.initial },
                query(args)
            ).pipe(Effect.provide(api.remote(args.domain_id)))
            return query(args).read(result)._tag === "Ready"
                ? Loaded({
                      epoch: args.epoch,
                      generation: args.generation,
                      remote: result.remote,
                  })
                : LoadFailed(args)
        }).pipe(Effect.catch(() => Effect.succeed(LoadFailed(args)))),
})
const PrepareChatSend = Command.define("PrepareChatSend", {
    args: {
        ...scope_fields,
        id: S.String,
        body: S.String,
        mentioned_user_ids: S.Array(S.String),
    },
    messages: [Prepared],
    execute: (args) =>
        Effect.sync(() =>
            Prepared({
                epoch: args.epoch,
                generation: args.generation,
                message: {
                    id: args.id || crypto.randomUUID(),
                    body: args.body,
                    mentioned_user_ids: args.mentioned_user_ids,
                },
            })
        ),
})
const SendChatMessage = Command.define("SendChatMessage", {
    args: { ...scope_fields, message: SendChatInput },
    messages: [Saved],
    execute: (args) =>
        Effect.gen(function* () {
            const api = yield* ContactsApi
            const result = yield* Remote.mutate(
                SendChat,
                {
                    account_id: args.account_id,
                    domain_id: args.domain_id,
                    message: args.message,
                },
                args.message.id
            ).pipe(Effect.provide(api.remote(args.domain_id)))
            return Saved({
                epoch: args.epoch,
                generation: args.generation,
                message: {
                    _tag: "MutationSucceeded",
                    requestId: args.message.id,
                    entities: result.entities,
                    connections: result.connections,
                },
            })
        }).pipe(
            Effect.catch(() =>
                Effect.succeed(
                    Saved({
                        epoch: args.epoch,
                        generation: args.generation,
                        message: {
                            _tag: "MutationFailed",
                            requestId: args.message.id,
                            error: {
                                _tag: "ChatSendFailed",
                                message:
                                    "Message could not be confirmed. Retry the unchanged message safely, or refresh.",
                            },
                        },
                    })
                )
            )
        ),
})
export const update = (model: Model, message: Message): UpdateReturn => {
    if (
        ("epoch" in message && message.epoch !== model.epoch) ||
        ("generation" in message && message.generation !== model.generation)
    )
        return [model, []]
    if (message._tag === "ChatPolled" || message._tag === "ChatRefreshed")
        return !model.can_access ||
            model.domain_id === "" ||
            model.loading ||
            model.ui.sending
            ? [model, []]
            : [{ ...model, loading: true }, [LoadChat(scope(model))]]
    if (message._tag === "ChatLoaded") {
        const next = {
            ...model,
            remote: message.remote,
            loading: false,
            loaded: true,
        }
        const [ui] = Chat.update(
            project(next),
            Chat.ReceivedMentionableAdmins({
                admins: library(next)?.admins ?? [],
            }),
            Option.some(model.domain_id)
        )
        return [{ ...next, ui: ui_only(ui) }, []]
    }
    if (message._tag === "ChatLoadFailed")
        return [
            { ...model, remote: Remote.initial, loading: false, loaded: false },
            [],
        ]
    if (message._tag === "ChatSendPrepared") {
        if (!model.ui.sending || !model.can_access) return [model, []]
        return [
            { ...model, send_id: message.message.id },
            [SendChatMessage({ ...scope(model), message: message.message })],
        ]
    }
    if (message._tag === "ChatSaved") {
        if (message.message._tag === "MutationFailed")
            return [
                {
                    ...model,
                    ui: {
                        ...model.ui,
                        sending: false,
                        maybe_error: Option.some(message.message.error.message),
                    },
                },
                [],
            ]
        const next = {
            ...model,
            remote: Data.reduce(model, message.message).remote,
            loaded: true,
            send_id: "",
        }
        const [ui] = Chat.update(
            project(next),
            Chat.SucceededSendChatMessage(),
            Option.some(model.domain_id)
        )
        return [{ ...next, ui: ui_only(ui) }, []]
    }
    if (
        [
            "ReceivedChatMessages",
            "ReceivedMentionableAdmins",
            "SucceededSendChatMessage",
            "FailedChat",
        ].includes(message._tag)
    )
        return [model, []]
    if (model.ui.sending) return [model, []]
    const [ui] = Chat.update(
        project(model),
        message,
        Option.some(model.domain_id)
    )
    const next = { ...model, ui: ui_only(ui) }
    if (message._tag !== "SubmittedChatMessage")
        return [
            {
                ...next,
                send_id:
                    ui.draft !== model.ui.draft ||
                    ui.mentioned_admin_ids !== model.ui.mentioned_admin_ids
                        ? ""
                        : model.send_id,
            },
            [],
        ]
    if (!ui.sending) return [next, []]
    const sending = {
        ...next,
        loading: false,
        generation: model.generation + 1,
    }
    return [
        sending,
        [
            PrepareChatSend({
                ...scope(sending),
                id: model.send_id,
                body: ui.draft.trim(),
                mentioned_user_ids: ui.mentioned_admin_ids,
            }),
        ],
    ]
}
export const subscriptions = Subscription.make<Model, Message>()((entry) => ({
    refresh: entry(
        { account_id: S.String, domain_id: S.String, epoch: S.Number },
        {
            modelToDependencies: (model) => ({
                account_id: model.account_id,
                domain_id: model.domain_id,
                epoch: model.epoch,
            }),
            dependenciesToStream: ({ epoch }) =>
                Stream.concat(
                    Stream.succeed(Polled({ epoch })),
                    Stream.fromSchedule(Schedule.spaced("3 seconds")).pipe(
                        Stream.map(() => Polled({ epoch }))
                    )
                ),
        }
    ),
}))
export const view = Submodel.defineView<Model, Message>((model, h) =>
    h.div(
        [],
        [
            h.button(
                [
                    h.Type("button"),
                    h.Disabled(
                        !model.can_access || model.loading || model.ui.sending
                    ),
                    h.OnClick(Refreshed()),
                ],
                ["Refresh chat"]
            ),
            h.submodel({
                slotId: "chat-ui",
                model: project(model),
                view: Chat.view,
                toParentMessage: (message) => message,
            }),
        ]
    )
)
