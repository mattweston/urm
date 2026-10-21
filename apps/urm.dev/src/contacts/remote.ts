import { Schema } from "effect"
import { defineMessageUnion } from "foldkit/message"
import { Remote } from "foldkit-remote"
import { Surface } from "foldkit-surface"
import {
    ContactSummary,
    CreateRemoteContact,
    DomainContacts,
    RemoteContact,
    RenameRemoteContact,
    UpdateRemoteContact,
    DeleteRemoteContact,
    ImportRemoteContacts,
} from "@urm/contracts/contacts"

const Model = Schema.Struct({ remote: Remote.Model })
const Message = defineMessageUnion({ ...Remote.messages })
const App = Surface.application({
    Model,
    Message,
    initial: { remote: Remote.initial },
    update: (model: typeof Model.Type) => ({ model }),
})
export const Data = Remote.make({
    model: App.model.remote,
    entities: [RemoteContact],
    queries: [DomainContacts],
    mutations: [
        CreateRemoteContact,
        RenameRemoteContact,
        UpdateRemoteContact,
        DeleteRemoteContact,
        ImportRemoteContacts,
    ],
})
export const contacts_page = (
    domain_id: string,
    after: string | null = null,
    search = ""
) =>
    Data.query(
        DomainContacts,
        { domain_id, search: search.trim() },
        {
            select: ContactSummary,
            first: 25,
            ...(after === null ? {} : { after }),
        }
    )
