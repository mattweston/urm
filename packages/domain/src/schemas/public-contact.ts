import { Schema } from "effect"

import { Email } from "./contacts.ts"

export const PublicContactSubmissionRequest = Schema.Struct({
    name: Schema.Trimmed.check(Schema.isMinLength(1), Schema.isMaxLength(255)),
    email: Email,
    message: Schema.Trimmed.check(
        Schema.isMinLength(1),
        Schema.isMaxLength(5_000)
    ),
})

export type PublicContactSubmissionRequest = Schema.Schema.Type<
    typeof PublicContactSubmissionRequest
>
