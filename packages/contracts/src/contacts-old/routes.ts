import { Rpc, RpcGroup } from "effect/rpc"
import { Schema } from "effect"
import {
    Contact,
    UpdateDomainContactProfileInput,
    NotFoundError,
    DatabaseError,
    ConflictError,
} from "@urm/domain/schemas/contacts"
import { AuthorizationError } from "@urm/domain/errors"
import { AuthenticatedRpcMiddleware } from "../auth-legacy/rpc-middleware.ts"

// Deliberately looser than CreateContactInput: no id, no updated_at, and email
// is a plain string rather than the branded Email. The handler bridges the two,
// so the RPC boundary is not where address validation happens.
const CreateContactRpcData = Schema.Struct({
    name: Schema.String,
    email: Schema.optional(Schema.String),
    tel: Schema.optional(Schema.String),
    title: Schema.optional(Schema.String),
    company: Schema.optional(Schema.String),
})

export const ContactsListRpc = Rpc.make("contacts.list", {
    payload: Schema.Struct({
        domain_id: Schema.String,
    }),
    success: Schema.Array(Contact),
    error: Schema.Union([AuthorizationError, DatabaseError]),
})

export const ContactsGetRpc = Rpc.make("contacts.get", {
    payload: Schema.Struct({
        domain_id: Schema.String,
        id: Schema.String,
    }),
    success: Contact,
    error: Schema.Union([AuthorizationError, NotFoundError, DatabaseError]),
})

export const ContactsCreateRpc = Rpc.make("contacts.create", {
    payload: Schema.Struct({
        domain_id: Schema.String,
        data: CreateContactRpcData,
    }),
    success: Schema.Struct({
        item: Contact,
        txid: Schema.Number,
    }),
    error: Schema.Union([AuthorizationError, DatabaseError, ConflictError]),
})

export const ContactsUpdateRpc = Rpc.make("contacts.update", {
    payload: Schema.Struct({
        domain_id: Schema.String,
        id: Schema.String,
        data: UpdateDomainContactProfileInput,
    }),
    success: Schema.Struct({
        item: Contact,
        txid: Schema.Number,
    }),
    error: Schema.Union([AuthorizationError, NotFoundError, DatabaseError]),
})

export const ContactsDeleteRpc = Rpc.make("contacts.delete", {
    payload: Schema.Struct({
        domain_id: Schema.String,
        id: Schema.String,
    }),
    success: Schema.Struct({
        txid: Schema.Number,
    }),
    error: Schema.Union([AuthorizationError, NotFoundError, DatabaseError]),
})

export const ContactsRpcs = RpcGroup.make(
    ContactsListRpc,
    ContactsGetRpc,
    ContactsCreateRpc,
    ContactsUpdateRpc,
    ContactsDeleteRpc
).middleware(AuthenticatedRpcMiddleware)
