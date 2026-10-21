import { Rpc, RpcGroup } from "effect/unstable/rpc"
import { Schema } from "effect"
import {
    AuthenticatedRpcMiddleware,
    PlatformAdminRpcMiddleware,
} from "../auth-legacy/rpc-middleware.ts"
import {
    AuthorizationError,
    DatabaseError,
    ValidationError,
} from "@urm/domain/errors"
import {
    ListPlatformNewsletterSubscribersRequest,
    PlatformNewsletterSubscriber,
    SendPlatformNewsletterRequest,
    SendPlatformNewsletterResponse,
    SetPlatformNewsletterSubscriberStatusRequest,
} from "@urm/domain/schemas/platform-newsletter"

export const PlatformNewsletterSubscribersListRpc = Rpc.make(
    "platform.newsletter.subscribers.list",
    {
        payload: Schema.Struct({
            data: ListPlatformNewsletterSubscribersRequest,
        }),
        success: Schema.Array(PlatformNewsletterSubscriber),
        error: Schema.Union([AuthorizationError, DatabaseError]),
    }
)

export const PlatformNewsletterSubscribersSetRpc = Rpc.make(
    "platform.newsletter.subscribers.set",
    {
        payload: Schema.Struct({
            data: SetPlatformNewsletterSubscriberStatusRequest,
        }),
        success: PlatformNewsletterSubscriber,
        error: Schema.Union([
            AuthorizationError,
            DatabaseError,
            ValidationError,
        ]),
    }
)

export const PlatformNewsletterSendRpc = Rpc.make("platform.newsletter.send", {
    payload: Schema.Struct({ data: SendPlatformNewsletterRequest }),
    success: SendPlatformNewsletterResponse,
    error: Schema.Union([AuthorizationError, DatabaseError, ValidationError]),
})

export const PlatformNewsletterRpcs = RpcGroup.make(
    PlatformNewsletterSubscribersListRpc,
    PlatformNewsletterSubscribersSetRpc,
    PlatformNewsletterSendRpc
)
    .middleware(PlatformAdminRpcMiddleware)
    .middleware(AuthenticatedRpcMiddleware)
