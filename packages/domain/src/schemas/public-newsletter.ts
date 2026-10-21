import { Schema } from "effect"

export const PublicNewsletterSubscriptionRequest = Schema.Struct({
    email: Schema.String.check(Schema.isMaxLength(255)),
})

export type PublicNewsletterSubscriptionRequest = Schema.Schema.Type<
    typeof PublicNewsletterSubscriptionRequest
>
