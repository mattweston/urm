import {
    Array,
    Duration,
    Effect,
    Random,
    String as String_,
    Schema as S,
} from "effect"
import { Command } from "foldkit"
import { Invalid, Valid } from "foldkit/fieldValidation"
import { SubmittedForm, ValidatedEmail } from "./form.message.ts"

const FAKE_API_DELAY = Duration.millis(500)

const EMAILS_ON_WAITLIST = [
    "test@example.com",
    "demo@email.com",
    "admin@test.com",
]

export const ValidateEmail = Command.define("ValidateEmail", {
    args: { email: S.String, validationId: S.Number },
    messages: [ValidatedEmail],
    execute: ({ email, validationId }) =>
        Effect.gen(function* () {
            if (yield* isEmailOnWaitlist(email)) {
                return ValidatedEmail({
                    validationId,
                    field: Invalid({
                        value: email,
                        errors: ["This email is already on our waitlist"],
                    }),
                })
            }

            return ValidatedEmail({
                validationId,
                field: Valid({ value: email }),
            })
        }),
})

export const SubmitForm = Command.define("SubmitForm", {
    args: { name: S.String, email: S.String, message: S.String },
    messages: [SubmittedForm],
    execute: ({ name, email, message }) =>
        Effect.gen(function* () {
            yield* Effect.sleep(FAKE_API_DELAY)
            const success = yield* Random.nextBoolean

            return SubmittedForm({
                success,
                name,
                email,
                body: message,
            })
        }),
})

const isEmailOnWaitlist = (email: string): Effect.Effect<boolean> =>
    Effect.gen(function* () {
        yield* Effect.sleep(FAKE_API_DELAY)
        return Array.contains(EMAILS_ON_WAITLIST, String_.toLowerCase(email))
    })

export const validateEmail = (email: string, validationId: number) =>
    ValidateEmail({ email, validationId })

export const submitForm = (name: string, email: string, message: string) =>
    SubmitForm({ name, email, message })
