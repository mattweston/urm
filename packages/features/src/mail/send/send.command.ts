import { Effect, Schema as S } from "effect"
import { Command } from "foldkit"

import { SingleEmailFailed, SingleEmailSent } from "./send.message.ts"

export const SendSingleEmail = Command.define("SendSingleEmail", {
    args: {
        contactId: S.String,
        templateId: S.NullOr(S.String),
        subject: S.NullOr(S.String),
        bodyText: S.NullOr(S.String),
    },
    messages: [SingleEmailSent, SingleEmailFailed],
    execute: () =>
        Effect.succeed(
            SingleEmailFailed({
                error: "Email sending requires a host persistence adapter",
            })
        ),
})
