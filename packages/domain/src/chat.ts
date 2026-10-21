import { Schema } from "effect"
export const ChatMessageBody = Schema.Trimmed.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(4000)
)
export const ChatAdmin = Schema.Struct({
    user_id: Schema.String,
    name: Schema.String,
})
export type ChatAdmin = typeof ChatAdmin.Type
export const ChatMessage = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.String,
    author_kind: Schema.Literals(["admin", "urmbot"]),
    author_user_id: Schema.NullOr(Schema.String),
    author_name: Schema.String,
    body: Schema.String,
    mentions: Schema.Array(Schema.Literal("urmbot")),
    mentioned_user_ids: Schema.Array(Schema.String),
    created_at: Schema.Number,
})
export type ChatMessage = typeof ChatMessage.Type
export const ChatCatalogRecord = Schema.Struct({
    id: Schema.String,
    messages: Schema.Array(ChatMessage),
    admins: Schema.Array(ChatAdmin),
})
export type ChatCatalogRecord = typeof ChatCatalogRecord.Type
export const SendChatInput = Schema.Struct({
    id: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(128)),
    body: ChatMessageBody,
    mentioned_user_ids: Schema.Array(Schema.String).check(
        Schema.isMaxLength(20)
    ),
})
export type SendChatInput = typeof SendChatInput.Type
export class ChatWriteError extends Schema.TaggedErrorClass<ChatWriteError>()(
    "ChatWriteError",
    { message: Schema.String }
) {}
export const chat_catalog_id = (domain_id: string, account_id: string) =>
    `${domain_id}/${account_id}`
export const mentions_urmbot = (body: string) => /(^|\s)@urmbot\b/i.test(body)
