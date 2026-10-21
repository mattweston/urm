import { Schema } from "effect"

export const SubscriptionStatus = Schema.Literals([
    "subscribed",
    "unsubscribed",
    "suppressed",
])
export type SubscriptionStatus = typeof SubscriptionStatus.Type

export const Subscription = Schema.Struct({
    contact_id: Schema.String,
    name: Schema.String,
    email: Schema.String,
    list_key: Schema.String,
    status: SubscriptionStatus,
    source: Schema.NullOr(Schema.String),
    subscribed_at: Schema.NullOr(Schema.Number),
    unsubscribed_at: Schema.NullOr(Schema.Number),
})
export type Subscription = typeof Subscription.Type

export const SubscriptionCatalogRecord = Schema.Struct({
    id: Schema.String,
    list_key: Schema.String,
    subscriptions: Schema.Array(Subscription),
})
export type SubscriptionCatalogRecord = typeof SubscriptionCatalogRecord.Type

export const SetSubscriptionInput = Schema.Struct({
    contact_id: Schema.String.check(
        Schema.isMinLength(1),
        Schema.isMaxLength(128)
    ),
    list_key: Schema.Trimmed.check(
        Schema.isMinLength(1),
        Schema.isMaxLength(128)
    ),
    // `suppressed` is set by delivery handling, never by an administrator.
    status: Schema.Literals(["subscribed", "unsubscribed"]),
})
export type SetSubscriptionInput = typeof SetSubscriptionInput.Type

export class SubscriptionWriteError extends Schema.TaggedErrorClass<SubscriptionWriteError>()(
    "SubscriptionWriteError",
    { message: Schema.String }
) {}

export const DEFAULT_LIST_KEY = "newsletter"

export const subscription_list_key = (value: string | undefined): string =>
    value?.trim() === undefined || value.trim() === ""
        ? DEFAULT_LIST_KEY
        : value.trim()

export const subscription_catalog_id = (
    domain_id: string,
    list_key: string
): string => `${domain_id}/${subscription_list_key(list_key)}`
