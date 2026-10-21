import { Effect, Schema as S } from "effect"
import { Command } from "foldkit"
import {
    SubscriptionsActionFailed,
    SubscriptionsLoaded,
    SubscriptionUpdated,
} from "./subscriptions.message.ts"
import { EmailSubscriptionStatus as EmailSubscriptionStatusType } from "@urm/domain/schemas/email"

export const LoadSubscriptions = Command.define("LoadSubscriptions", {
    args: { listKey: S.String },
    messages: [SubscriptionsLoaded, SubscriptionsActionFailed],
    execute: () =>
        Effect.succeed(
            SubscriptionsActionFailed({
                action: "load",
                error: "No subscriptions persistence adapter installed",
            })
        ),
})
export const SetSubscriptionStatus = Command.define("SetSubscriptionStatus", {
    args: {
        contact_id: S.String,
        listKey: S.String,
        status: EmailSubscriptionStatusType,
    },
    messages: [SubscriptionUpdated, SubscriptionsActionFailed],
    execute: () =>
        Effect.succeed(
            SubscriptionsActionFailed({
                action: "set",
                error: "No subscriptions persistence adapter installed",
            })
        ),
})
