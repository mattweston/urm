import { Schema } from "effect"
import { Entity, Mutation, Remote } from "foldkit-remote"
import { ChatCatalogRecord, SendChatInput } from "@urm/domain/chat"
export const ChatCatalog = Entity.make("ChatCatalog", ChatCatalogRecord)
export const ChatSummary = ChatCatalog.select({
    id: true,
    messages: true,
    admins: true,
})
export const SendChat = Mutation.make("SendChat", {
    Input: {
        domain_id: Schema.String,
        account_id: Schema.String,
        message: SendChatInput,
    },
    Output: { id: Schema.String },
})
export const ChatRemote = Remote.define({
    entities: [ChatCatalog],
    mutations: [SendChat],
})
