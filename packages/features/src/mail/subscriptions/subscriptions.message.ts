import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import {
    EmailSubscription,
    EmailSubscriptionStatus,
} from "@urm/domain/schemas/email"

export const UpdatedSubscriptionsListKey = taggedStruct(
    "UpdatedSubscriptionsListKey",
    {
        value: S.String,
    }
)

export const SubmittedSubscriptionsListKey = taggedStruct(
    "SubmittedSubscriptionsListKey"
)

export const SelectedSubscriptionContactChanged = taggedStruct(
    "SelectedSubscriptionContactChanged",
    { value: S.String }
)

export const SubmittedSubscriptionContact = taggedStruct(
    "SubmittedSubscriptionContact"
)

export const SubscriptionsLoaded = taggedStruct("SubscriptionsLoaded", {
    subscriptions: S.Array(EmailSubscription),
})

export const SubscriptionStatusChanged = taggedStruct(
    "SubscriptionStatusChanged",
    {
        contact_id: S.String,
        status: EmailSubscriptionStatus,
    }
)

export const SubscriptionUpdated = taggedStruct("SubscriptionUpdated", {
    subscription: EmailSubscription,
})

export const SubscriptionsActionFailed = taggedStruct(
    "SubscriptionsActionFailed",
    {
        action: S.Union([S.Literal("load"), S.Literal("set")]),
        error: S.String,
    }
)

export const Message = S.Union([
    UpdatedSubscriptionsListKey,
    SubmittedSubscriptionsListKey,
    SelectedSubscriptionContactChanged,
    SubmittedSubscriptionContact,
    SubscriptionsLoaded,
    SubscriptionStatusChanged,
    SubscriptionUpdated,
    SubscriptionsActionFailed,
])

export type Message = typeof Message.Type
