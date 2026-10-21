import { Schema } from "effect"
import { Rpc, RpcGroup } from "effect/unstable/rpc"
import {
    DatabaseError,
    SendSmallNewsletterRequest,
    SendSmallNewsletterResponse,
    ListEmailSubscriptionsRequest,
    ListEmailSubscriptionsResponse,
    SetEmailSubscriptionRequest,
    EmailSubscription,
    ValidationError,
    AuthorizationError,
} from "@urm/domain/schemas/email"
import {
    ActiveDomainRpcMiddleware,
    AuthenticatedRpcMiddleware,
    DomainManagerRpcMiddleware,
} from "../auth-legacy/rpc-middleware.ts"

export const MailNewsletterSendRpc = Rpc.make("mail.newsletter.send", {
    payload: Schema.Struct({
        data: SendSmallNewsletterRequest,
    }),
    success: SendSmallNewsletterResponse,
    error: Schema.Union([ValidationError, DatabaseError, AuthorizationError]),
})

export const MailSubscriptionsListRpc = Rpc.make("mail.subscriptions.list", {
    payload: Schema.Struct({
        data: ListEmailSubscriptionsRequest,
    }),
    success: ListEmailSubscriptionsResponse,
    error: Schema.Union([DatabaseError, AuthorizationError]),
})

export const MailSubscriptionsSetRpc = Rpc.make("mail.subscriptions.set", {
    payload: Schema.Struct({
        data: SetEmailSubscriptionRequest,
    }),
    success: EmailSubscription,
    error: Schema.Union([ValidationError, DatabaseError, AuthorizationError]),
})

export const MailRpcs = RpcGroup.make(
    MailNewsletterSendRpc,
    MailSubscriptionsListRpc,
    MailSubscriptionsSetRpc
)
    .middleware(DomainManagerRpcMiddleware)
    .middleware(ActiveDomainRpcMiddleware)
    .middleware(AuthenticatedRpcMiddleware)
