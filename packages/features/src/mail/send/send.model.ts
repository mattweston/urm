import { Schema as S } from "effect"
import { EmailPublicationTheme } from "@urm/email/publication-theme"
import { TransactionalTemplateState } from "@urm/email/transactional-content"

export const SendRecipient = S.Struct({
    id: S.String,
    name: S.String,
    email: S.String,
})

export type SendRecipient = typeof SendRecipient.Type

export const Model = S.Struct({
    domain_id: S.String,
    loading_recipients: S.Boolean,
    transactional_templates: S.Array(TransactionalTemplateState),
    publication_theme: S.NullOr(EmailPublicationTheme),
    recipients: S.Array(SendRecipient),
    mode: S.Literals(["one_off", "template"]),
    selectedContactId: S.String,
    selectedTemplateId: S.String,
    subject: S.String,
    bodyText: S.String,
    sending: S.Boolean,
    notice: S.NullOr(S.String),
    error: S.NullOr(S.String),
})

export type Model = typeof Model.Type
