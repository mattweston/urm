import { Option, Schema as S } from "effect"

export const ChannelId = S.Literals(["general", "design", "random"])
export type ChannelId = typeof ChannelId.Type
export const Author = S.Struct({
    name: S.String,
    initials: S.String,
    tone: S.String,
})
export type Author = typeof Author.Type
export const RelayMessage = S.Struct({
    id: S.String,
    channel: ChannelId,
    author: Author,
    body: S.String,
    sent_at: S.String,
    order: S.Number,
    reactions: S.Number,
    thread_count: S.Number,
    request_id: S.Option(S.String),
    delivery: S.Literals(["Published", "Pending", "Failed"]),
})
export type RelayMessage = typeof RelayMessage.Type
export const ThreadReply = S.Struct({
    id: S.String,
    author: Author,
    body: S.String,
    sent_at: S.String,
})
export type ThreadReply = typeof ThreadReply.Type
export const Model = S.Struct({
    channel: ChannelId,
    messages: S.Array(RelayMessage),
    composer: S.String,
    connection: S.Literals(["Live", "Paused", "Reconnecting"]),
    load_state: S.Literals(["Ready", "Loading", "Error"]),
    has_more: S.Boolean,
    next_sequence: S.Number,
    open_thread_id: S.Option(S.String),
    thread_state: S.Literals(["Idle", "Loading", "Ready", "Unavailable"]),
    thread_replies: S.Array(ThreadReply),
    thread_draft: S.String,
    activity: S.Option(S.String),
})
export type Model = typeof Model.Type

export const people = {
    avery: { name: "Avery Stone", initials: "AS", tone: "violet" },
    maya: { name: "Maya Chen", initials: "MC", tone: "coral" },
    kai: { name: "Kai Bell", initials: "KB", tone: "mint" },
    rowan: { name: "Rowan Ellis", initials: "RE", tone: "blue" },
}

const message = (
    id: string,
    channel: ChannelId,
    author: Author,
    body: string,
    order: number,
    reactions: number,
    thread_count: number
): RelayMessage => ({
    id,
    channel,
    author,
    body,
    sent_at:
        order < 3 ? "Yesterday" : `Today 9:${String(order).padStart(2, "0")}`,
    order,
    reactions,
    thread_count,
    request_id: Option.none(),
    delivery: "Published",
})
const general: ReadonlyArray<RelayMessage> = [
    message(
        "g-011",
        "general",
        people.maya,
        "Sharing the critique summary now: direction B is clearer under pressure.",
        11,
        9,
        0
    ),
    message(
        "g-013",
        "general",
        people.kai,
        "Two customers volunteered for the workflow follow-up next week.",
        13,
        5,
        1
    ),
    message(
        "g-014",
        "general",
        people.rowan,
        "The handoff checklist now includes ownership, rollback, and a success signal.",
        14,
        12,
        3
    ),
]
const design: ReadonlyArray<RelayMessage> = [
    message(
        "d-006",
        "design",
        people.maya,
        "I pushed the copy update and a higher-contrast focus treatment.",
        6,
        11,
        0
    ),
    message(
        "d-008",
        "design",
        people.avery,
        "I’ll bring the activation metrics so we can make the tradeoff explicit.",
        8,
        6,
        0
    ),
]
export const messagesForChannel = (
    channel: ChannelId
): ReadonlyArray<RelayMessage> =>
    channel === "general" ? general : channel === "design" ? design : []
export const repliesForThread = (
    channel: ChannelId,
    id: string
): ReadonlyArray<ThreadReply> =>
    channel === "general" && id === "g-014"
        ? [
              {
                  id: "reply-1",
                  author: people.maya,
                  body: "I added the release owner and verification step.",
                  sent_at: "Today 9:35",
              },
              {
                  id: "reply-2",
                  author: people.rowan,
                  body: "Rollback ownership is confirmed too.",
                  sent_at: "Today 9:39",
              },
          ]
        : channel === "general" && id === "g-013"
          ? [
                {
                    id: "reply-3",
                    author: people.maya,
                    body: "I’ll schedule the follow-up.",
                    sent_at: "Today 9:22",
                },
            ]
          : []
export const initialModel = (): Model => ({
    channel: "general",
    messages: general,
    composer: "",
    connection: "Live",
    load_state: "Ready",
    has_more: true,
    next_sequence: 20,
    open_thread_id: Option.none(),
    thread_state: "Idle",
    thread_replies: [],
    thread_draft: "",
    activity: Option.none(),
})
