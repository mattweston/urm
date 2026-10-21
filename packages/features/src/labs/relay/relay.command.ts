import { Effect, Option, Schema as S } from "effect"
import { Command } from "foldkit"
import {
    CompletedPublish,
    LoadedEarlier,
    LoadedThread,
    GotTeammateMessage,
} from "./relay.message.ts"
import {
    ChannelId,
    RelayMessage,
    messagesForChannel,
    people,
    repliesForThread,
} from "./relay.model.ts"

export const PublishRelayMessage = Command.define("PublishRelayMessage", {
    args: { request_id: S.String, message: RelayMessage },
    messages: [CompletedPublish],
    execute: ({ request_id, message }) =>
        Effect.succeed(
            CompletedPublish({
                request_id,
                published: {
                    ...message,
                    id: `server-${request_id}`,
                    delivery: "Published",
                },
                is_success: !message.body.includes("[fail]"),
            })
        ).pipe(Effect.delay("280 millis")),
})
export const LoadEarlierRelayMessages = Command.define(
    "LoadEarlierRelayMessages",
    {
        args: { channel: ChannelId },
        messages: [LoadedEarlier],
        execute: ({ channel }) =>
            Effect.succeed(
                LoadedEarlier({
                    messages: messagesForChannel(channel).map((item) => ({
                        ...item,
                        id: `earlier-${item.id}`,
                        order: item.order - 20,
                    })),
                })
            ).pipe(Effect.delay("220 millis")),
    }
)
export const LoadRelayThread = Command.define("LoadRelayThread", {
    args: { channel: ChannelId, id: S.String },
    messages: [LoadedThread],
    execute: ({ channel, id }) => {
        const replies = repliesForThread(channel, id)
        return Effect.succeed(
            LoadedThread({
                channel,
                id,
                replies,
                is_available: replies.length > 0,
            })
        ).pipe(Effect.delay("180 millis"))
    },
})
export const RequestRelayTeammateUpdate = Command.define(
    "RequestRelayTeammateUpdate",
    {
        args: { channel: ChannelId, sequence: S.Number },
        messages: [GotTeammateMessage],
        execute: ({ channel, sequence }) =>
            Effect.succeed(
                GotTeammateMessage({
                    message: {
                        id: `teammate-${sequence}`,
                        channel,
                        author: people.maya,
                        body: "Teammate update: the latest handoff detail is ready.",
                        sent_at: "Just now",
                        order: sequence,
                        reactions: 0,
                        thread_count: 0,
                        request_id: Option.none(),
                        delivery: "Published",
                    },
                })
            ).pipe(Effect.delay("320 millis")),
    }
)
