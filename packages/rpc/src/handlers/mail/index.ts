/**
 * # Mail RPC
 *
 * Newsletter/subscription endpoints backed by `@urm/email` (transport,
 * delivery ledger, unsubscribe tokens). Admin-only routes fail with
 * `AuthorizationError`; sends surface per-recipient failures via counts,
 * not errors (see `sendSmallNewsletter` in `@urm/email`).
 */
import { Effect, type Schema } from "effect"
import type {
    ActiveDomainRequestContext,
    AuthenticatedRequestContext,
} from "@urm/contracts/auth-legacy"
import {
    DatabaseError,
    EmailSubscription,
    EmailSubscriptionStatus,
    ListEmailSubscriptionsRequest,
    SendSmallNewsletterRequest,
    SendSmallNewsletterResponse,
    SetEmailSubscriptionRequest,
    ValidationError,
    AuthorizationError,
} from "@urm/domain/schemas/email"

export { MailNewsletterSendRpc, MailRpcs } from "@urm/contracts/mail"

export { MailRpcHandlersTagLive, MailRpcLive } from "./handlers.ts"
export { MailRpcHandlersTag } from "./tag.ts"
export { SubscriptionsServer } from "./remote.ts"
export {
    NewsletterImagePublishError,
    NewsletterImagePublisher,
    NewsletterImagePublisherLive,
} from "./publish-images.ts"
export {
    SubscriptionsRepository,
    SubscriptionsRepositoryLive,
    type SubscriptionsPrincipal,
} from "./repository.ts"

export type MailRpcHandlers = {
    "mail.newsletter.send": (params: {
        data: Schema.Schema.Type<typeof SendSmallNewsletterRequest>
    }) => Effect.Effect<
        Schema.Schema.Type<typeof SendSmallNewsletterResponse>,
        ValidationError | DatabaseError | AuthorizationError,
        ActiveDomainRequestContext | AuthenticatedRequestContext
    >
    "mail.subscriptions.list": (params: {
        data: Schema.Schema.Type<typeof ListEmailSubscriptionsRequest>
    }) => Effect.Effect<
        ReadonlyArray<Schema.Schema.Type<typeof EmailSubscription>>,
        DatabaseError | AuthorizationError,
        ActiveDomainRequestContext | AuthenticatedRequestContext
    >
    "mail.subscriptions.set": (params: {
        data: Schema.Schema.Type<typeof SetEmailSubscriptionRequest>
    }) => Effect.Effect<
        Schema.Schema.Type<typeof EmailSubscription>,
        ValidationError | DatabaseError | AuthorizationError,
        ActiveDomainRequestContext | AuthenticatedRequestContext
    >
}

export type MailSubscriptionStatus = Schema.Schema.Type<
    typeof EmailSubscriptionStatus
>
