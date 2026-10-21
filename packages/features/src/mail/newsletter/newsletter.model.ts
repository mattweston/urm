import { Schema as S } from "effect"
import { EmailPublicationTheme } from "@urm/email/publication-theme"
import { ContentTemplateSource } from "@urm/domain/schemas/content-templates"
import {
    EmailNewsletterDocument,
    emailNewsletterDocumentFromRichText,
} from "@urm/email/newsletter-content"
import { initRichTextEditor } from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.view.ts"
import { RichTextEditorModel } from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.schema.ts"

export const NewsletterDraft = S.Struct({
    name: S.String,
    subject: S.String,
    headline: S.String,
    body_text: S.String,
    cta_url: S.String,
    cta_label: S.String,
    list_key: S.String,
})

export type NewsletterDraft = typeof NewsletterDraft.Type

export const SavedNewsletterDraft = S.Struct({
    id: S.String,
    ...NewsletterDraft.fields,
    template_source: S.NullOr(ContentTemplateSource),
    updated_at: S.Number,
})

export type SavedNewsletterDraft = typeof SavedNewsletterDraft.Type

export const NewsletterRecipient = S.Struct({
    contact_id: S.String,
    name: S.String,
    email: S.String,
})

export type NewsletterRecipient = typeof NewsletterRecipient.Type

export const NewsletterSendSummary = S.Struct({
    id: S.String,
    audience: S.Literals(["test", "subscribers"]),
    status: S.Literals(["draft", "queued", "sending", "completed", "failed"]),
    approved_contact_count: S.Number,
    accepted_count: S.Number,
    queued_count: S.Number,
    sent_count: S.Number,
    failed_count: S.Number,
    skipped_count: S.Number,
    authoring_template_source: S.NullOr(ContentTemplateSource),
    delivery_template_source: S.NullOr(ContentTemplateSource),
    created_at: S.Number,
    completed_at: S.NullOr(S.Number),
})

export type NewsletterSendSummary = typeof NewsletterSendSummary.Type

export const blankNewsletterDraft = (): NewsletterDraft => ({
    name: "",
    subject: "",
    headline: "",
    body_text: "",
    cta_url: "",
    cta_label: "",
    list_key: "newsletter",
})

export const Model = S.Struct({
    publication_theme: S.NullOr(EmailPublicationTheme),
    drafts: S.Array(SavedNewsletterDraft),
    selectedDraftId: S.String,
    creation_template_id: S.NullOr(S.String),
    draft: NewsletterDraft,
    base_draft: S.NullOr(NewsletterDraft),
    base_updated_at: S.Number,
    uploading: S.Boolean,
    image_picker_open: S.Boolean,
    block_document: EmailNewsletterDocument,
    next_block_id: S.Number,
    editor: RichTextEditorModel,
    recipients: S.Array(NewsletterRecipient),
    sends: S.Array(NewsletterSendSummary),
    testRecipientName: S.String,
    testRecipientEmail: S.String,
    sending: S.NullOr(S.Literals(["test", "subscribers"])),
    confirmingSubscriberSend: S.Boolean,
    editing: S.Boolean,
    loading: S.Boolean,
    saving: S.Boolean,
    templateName: S.String,
    templateDescription: S.String,
    templateTags: S.String,
    templateSaveStatus: S.Literals(["idle", "saving"]),
    error: S.NullOr(S.String),
    notice: S.NullOr(S.String),
})

export type Model = typeof Model.Type

export const blankNewsletterEditor = (): RichTextEditorModel =>
    initRichTextEditor()

export const blankNewsletterBlockDocument = () =>
    emailNewsletterDocumentFromRichText(blankNewsletterEditor().document)
