import { Schema } from "effect"

export const Message = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.String,
    author: Schema.optional(Schema.String),
    contact_id: Schema.String,
    body: Schema.String,
    timestamp: Schema.optional(Schema.Number),
    updated_at: Schema.Number,
})

export type Message = Schema.Schema.Type<typeof Message>

export const SendMessageRequest = Schema.Struct({
    author: Schema.optional(Schema.String),
    contact_id: Schema.String,
    body: Schema.String,
    timestamp: Schema.optional(Schema.Number),
})

export type SendMessageRequest = Schema.Schema.Type<typeof SendMessageRequest>

export const UpdateMessageRequest = Schema.Struct({
    author: Schema.optional(Schema.String),
    contact_id: Schema.optional(Schema.String),
    body: Schema.optional(Schema.String),
    timestamp: Schema.optional(Schema.Number),
})

export type UpdateMessageRequest = Schema.Schema.Type<
    typeof UpdateMessageRequest
>

export const ChatAgentId = Schema.Literals(["urmbot"])

export type ChatAgentId = Schema.Schema.Type<typeof ChatAgentId>

export const ChatThreadKind = Schema.Literals(["direct", "group", "agent"])

export type ChatThreadKind = Schema.Schema.Type<typeof ChatThreadKind>

export const ChatTurnStatus = Schema.Literals([
    "pending",
    "streaming",
    "completed",
    "failed",
])

export type ChatTurnStatus = Schema.Schema.Type<typeof ChatTurnStatus>

export const ChatCalloutVariant = Schema.Literals([
    "note",
    "tip",
    "caution",
    "danger",
    "success",
    "announcement",
])

export type ChatCalloutVariant = Schema.Schema.Type<typeof ChatCalloutVariant>

export const ChatCitation = Schema.Struct({
    source_id: Schema.String,
    label: Schema.String,
    href: Schema.optional(Schema.String),
})

export type ChatCitation = Schema.Schema.Type<typeof ChatCitation>

export const ChatContactParticipant = Schema.Struct({
    id: Schema.String,
    kind: Schema.Literal("contact"),
    label: Schema.String,
})

export type ChatContactParticipant = Schema.Schema.Type<
    typeof ChatContactParticipant
>

export const ChatAgentParticipant = Schema.Struct({
    id: ChatAgentId,
    kind: Schema.Literal("agent"),
    label: Schema.String,
})

export type ChatAgentParticipant = Schema.Schema.Type<
    typeof ChatAgentParticipant
>

export const ChatParticipant = Schema.Union([
    ChatContactParticipant,
    ChatAgentParticipant,
])

export type ChatParticipant = Schema.Schema.Type<typeof ChatParticipant>

export const ChatMarkdownBlock = Schema.Struct({
    _tag: Schema.Literal("markdown"),
    markdown: Schema.String,
})

export type ChatMarkdownBlock = Schema.Schema.Type<typeof ChatMarkdownBlock>

export const ChatCalloutBlock = Schema.Struct({
    _tag: Schema.Literal("callout"),
    variant: ChatCalloutVariant,
    title: Schema.String,
    markdown: Schema.String,
})

export type ChatCalloutBlock = Schema.Schema.Type<typeof ChatCalloutBlock>

export const ChatCardBlock = Schema.Struct({
    _tag: Schema.Literal("card"),
    title: Schema.String,
    description: Schema.String,
    href: Schema.optional(Schema.String),
})

export type ChatCardBlock = Schema.Schema.Type<typeof ChatCardBlock>

export const ChatBlock = Schema.Union([
    ChatMarkdownBlock,
    ChatCalloutBlock,
    ChatCardBlock,
])

export type ChatBlock = Schema.Schema.Type<typeof ChatBlock>

export const ChatThread = Schema.Struct({
    id: Schema.String,
    kind: ChatThreadKind,
    participants: Schema.Array(ChatParticipant),
    created_at: Schema.Number,
    updated_at: Schema.Number,
})

export type ChatThread = Schema.Schema.Type<typeof ChatThread>

export const ChatTurn = Schema.Struct({
    id: Schema.String,
    thread_id: Schema.String,
    author: ChatParticipant,
    status: ChatTurnStatus,
    text: Schema.String,
    blocks: Schema.Array(ChatBlock),
    citations: Schema.Array(ChatCitation),
    created_at: Schema.Number,
})

export type ChatTurn = Schema.Schema.Type<typeof ChatTurn>

export const SubmitChatTurn = Schema.Struct({
    thread_id: Schema.String,
    text: Schema.String,
})

export type SubmitChatTurn = Schema.Schema.Type<typeof SubmitChatTurn>

export { ConflictError, DatabaseError, NotFoundError } from "../errors.ts"
