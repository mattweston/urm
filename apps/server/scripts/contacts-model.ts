import { Schema } from "effect"
import { defineMessageUnion } from "foldkit/message"
import type * as Update from "foldkit/update"
import { Remote, type RemoteClient } from "foldkit-remote"
import { Surface } from "foldkit-surface"
import {
    ContactSummary,
    CreateRemoteContact,
    DomainContacts,
    RemoteContact,
    RenameRemoteContact,
} from "@urm/contracts/contacts"

const Model = Schema.Struct({ remote: Remote.Model })
type Model = typeof Model.Type
const Message = defineMessageUnion({ ...Remote.messages })
type Message = typeof Message.Type
function update(
    model: Model,
    message: Message
): Update.Return<Model, Message, RemoteClient> {
    return { model: ContactsData.reduce(model, message) }
}
export const ContactsApp = Surface.application({
    Model,
    Message,
    initial: { remote: Remote.initial },
    update,
})
export const ContactsData = Remote.make({
    model: ContactsApp.model.remote,
    entities: [RemoteContact],
    queries: [DomainContacts],
    mutations: [CreateRemoteContact, RenameRemoteContact],
})
export const contacts_page = (domain_id: string) =>
    ContactsData.query(
        DomainContacts,
        { domain_id },
        { select: ContactSummary, first: 25 }
    )
