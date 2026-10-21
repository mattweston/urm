import { Match as M, Option } from "effect"
import { Command } from "foldkit"
import { modifyFields } from "foldkit/struct"
import {
    LoadEarlierRelayMessages,
    LoadRelayThread,
    PublishRelayMessage,
    RequestRelayTeammateUpdate,
} from "./relay.command.ts"
import type { Message } from "./relay.message.ts"
import {
    initialModel,
    messagesForChannel,
    people,
    type Model,
    type RelayMessage,
} from "./relay.model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()
const mergeMessage = (
    messages: ReadonlyArray<RelayMessage>,
    incoming: RelayMessage
) =>
    [
        ...messages.filter(
            (item) =>
                item.id !== incoming.id &&
                (!Option.isSome(incoming.request_id) ||
                    !Option.contains(
                        item.request_id,
                        incoming.request_id.value
                    ))
        ),
        incoming,
    ].sort((left, right) => left.order - right.order)
export const init = (): UpdateReturn => [initialModel(), []]
export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            ChangedChannel: ({ channel }) => [
                modifyFields(model, {
                    channel: () => channel,
                    messages: () => messagesForChannel(channel),
                    composer: () => "",
                    load_state: () => "Ready",
                    has_more: () => channel !== "random",
                    open_thread_id: () => Option.none(),
                    thread_state: () => "Idle",
                    thread_replies: () => [],
                    thread_draft: () => "",
                }),
                [],
            ],
            ChangedComposer: ({ value }) => [
                modifyFields(model, { composer: () => value }),
                [],
            ],
            SubmittedMessage: () => {
                const body = model.composer.trim()
                if (body === "" || model.connection === "Paused")
                    return [model, []]
                const request_id = `request-${model.next_sequence}`
                const pending: RelayMessage = {
                    id: `local-${request_id}`,
                    channel: model.channel,
                    author: people.avery,
                    body,
                    sent_at: "Just now",
                    order: model.next_sequence,
                    reactions: 0,
                    thread_count: 0,
                    request_id: Option.some(request_id),
                    delivery: "Pending",
                }
                return [
                    modifyFields(model, {
                        messages: (messages) => [...messages, pending],
                        composer: () => "",
                        next_sequence: (value) => value + 1,
                    }),
                    [PublishRelayMessage({ request_id, message: pending })],
                ]
            },
            CompletedPublish: ({ request_id, published, is_success }) =>
                is_success
                    ? [
                          modifyFields(model, {
                              messages: (messages) =>
                                  mergeMessage(messages, published),
                              activity: () => Option.some("Message published"),
                          }),
                          [],
                      ]
                    : [
                          modifyFields(model, {
                              messages: (messages) =>
                                  messages.map((item) =>
                                      Option.contains(
                                          item.request_id,
                                          request_id
                                      )
                                          ? modifyFields(item, {
                                                delivery: () => "Failed",
                                            })
                                          : item
                                  ),
                              activity: () =>
                                  Option.some("Message could not be sent"),
                          }),
                          [],
                      ],
            ClickedReaction: ({ id }) => [
                modifyFields(model, {
                    messages: (messages) =>
                        messages.map((item) =>
                            item.id === id
                                ? modifyFields(item, { reactions: (value) => value + 1 })
                                : item
                        ),
                }),
                [],
            ],
            ToggledConnection: () => [
                modifyFields(model, {
                    connection: (value) =>
                        value === "Paused" ? "Live" : "Paused",
                    activity: () =>
                        Option.some(
                            model.connection === "Paused"
                                ? "Live updates resumed"
                                : "Live updates paused"
                        ),
                }),
                [],
            ],
            RequestedTeammateUpdate: () =>
                model.connection === "Paused"
                    ? [
                          modifyFields(model, {
                              activity: () =>
                                  Option.some(
                                      "A teammate update is waiting for reconnect"
                                  ),
                          }),
                          [],
                      ]
                    : [
                          modifyFields(model, {
                              activity: () =>
                                  Option.some("Requesting a teammate update"),
                          }),
                          [
                              RequestRelayTeammateUpdate({
                                  channel: model.channel,
                                  sequence: model.next_sequence,
                              }),
                          ],
                      ],
            GotTeammateMessage: ({ message }) => [
                modifyFields(model, {
                    messages: (messages) => mergeMessage(messages, message),
                    next_sequence: (value) => value + 1,
                    activity: () => Option.some("Teammate update received"),
                }),
                [],
            ],
            ClickedLoadEarlier: () => [
                modifyFields(model, { load_state: () => "Loading" }),
                [LoadEarlierRelayMessages({ channel: model.channel })],
            ],
            LoadedEarlier: ({ messages }) => [
                modifyFields(model, {
                    messages: (current) => [...messages, ...current],
                    has_more: () => false,
                    load_state: () => "Ready",
                }),
                [],
            ],
            OpenedThread: ({ id }) => [
                modifyFields(model, {
                    open_thread_id: () => Option.some(id),
                    thread_state: () => "Loading",
                    thread_replies: () => [],
                    thread_draft: () => "",
                }),
                [LoadRelayThread({ channel: model.channel, id })],
            ],
            LoadedThread: ({ channel, id, replies, is_available }) =>
                channel !== model.channel ||
                !Option.contains(model.open_thread_id, id)
                    ? [model, []]
                    : [
                          modifyFields(model, {
                              thread_state: () =>
                                  is_available ? "Ready" : "Unavailable",
                              thread_replies: () => replies,
                          }),
                          [],
                      ],
            ClosedThread: () => [
                modifyFields(model, {
                    open_thread_id: () => Option.none(),
                    thread_state: () => "Idle",
                    thread_replies: () => [],
                    thread_draft: () => "",
                }),
                [],
            ],
            ChangedThreadDraft: ({ value }) => [
                modifyFields(model, { thread_draft: () => value }),
                [],
            ],
            SubmittedThreadReply: () => {
                const body = model.thread_draft.trim()
                if (body === "" || model.thread_state !== "Ready")
                    return [model, []]
                const reply = {
                    id: `local-reply-${model.next_sequence}`,
                    author: people.avery,
                    body,
                    sent_at: "Just now",
                }
                return [
                    modifyFields(model, {
                        thread_replies: (replies) => [...replies, reply],
                        thread_draft: () => "",
                        next_sequence: (value) => value + 1,
                    }),
                    [],
                ]
            },
        })
    )
