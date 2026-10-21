import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { RichTextEditorMessage } from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.schema.ts"

import {
    NewsletterRecipient,
    NewsletterSendSummary,
    SavedNewsletterDraft,
} from "./newsletter.model.ts"

export const UpdatedNewsletterDraft = taggedStruct("UpdatedNewsletterDraft", {
    field: S.Union([
        S.Literal("name"),
        S.Literal("subject"),
        S.Literal("headline"),
        S.Literal("body_text"),
        S.Literal("cta_url"),
        S.Literal("cta_label"),
        S.Literal("list_key"),
    ]),
    value: S.String,
})

export const ToggledNewsletterEditing = taggedStruct("ToggledNewsletterEditing")
export const GotNewsletterRichTextEditorMessage = taggedStruct(
    "GotNewsletterRichTextEditorMessage",
    { message: RichTextEditorMessage }
)
export const ClosedNewsletterImagePicker = taggedStruct(
    "ClosedNewsletterImagePicker"
)
export const RequestedNewsletterImageUpload = taggedStruct(
    "RequestedNewsletterImageUpload"
)
export const SelectedNewsletterMediaImage = taggedStruct(
    "SelectedNewsletterMediaImage",
    { src: S.String, url: S.String, alt: S.String }
)
export const AddedNewsletterBlock = taggedStruct("AddedNewsletterBlock", {
    kind: S.Literals([
        "hero",
        "call_to_action",
        "testimonial",
        "article_card",
        "gallery",
    ]),
})
export const MovedNewsletterBlock = taggedStruct("MovedNewsletterBlock", {
    block_id: S.String,
    direction: S.Literals(["up", "down"]),
})
export const RemovedNewsletterBlock = taggedStruct("RemovedNewsletterBlock", {
    block_id: S.String,
})
export const ChangedNewsletterBlockField = taggedStruct(
    "ChangedNewsletterBlockField",
    {
        block_id: S.String,
        field: S.Literals([
            "eyebrow",
            "heading",
            "body",
            "label",
            "url",
            "quote",
            "attribution",
            "kicker",
            "summary",
            "link_label",
        ]),
        value: S.String,
    }
)
export const ChangedNewsletterBlockImage = taggedStruct(
    "ChangedNewsletterBlockImage",
    {
        block_id: S.String,
        image_id: S.String,
        field: S.Literals(["src", "alt"]),
        value: S.String,
    }
)
export const AddedNewsletterGalleryImage = taggedStruct(
    "AddedNewsletterGalleryImage",
    {
        block_id: S.String,
    }
)
export const MovedNewsletterGalleryImage = taggedStruct(
    "MovedNewsletterGalleryImage",
    {
        block_id: S.String,
        image_id: S.String,
        direction: S.Literals(["up", "down"]),
    }
)
export const RemovedNewsletterGalleryImage = taggedStruct(
    "RemovedNewsletterGalleryImage",
    {
        block_id: S.String,
        image_id: S.String,
    }
)
export const SelectedNewsletterDraftChanged = taggedStruct(
    "SelectedNewsletterDraftChanged",
    { draftId: S.String }
)
export const ClickedNewNewsletterDraft = taggedStruct(
    "ClickedNewNewsletterDraft"
)
export const SubmittedNewsletterDraft = taggedStruct("SubmittedNewsletterDraft")
export const ChangedNewsletterTemplateMetadata = taggedStruct(
    "ChangedNewsletterTemplateMetadata",
    {
        field: S.Literals(["name", "description", "tags"]),
        value: S.String,
    }
)
export const SubmittedNewsletterTemplate = taggedStruct(
    "SubmittedNewsletterTemplate"
)
export const NewsletterTemplateSaved = taggedStruct("NewsletterTemplateSaved")
export const NewsletterTemplateSaveFailed = taggedStruct(
    "NewsletterTemplateSaveFailed",
    {
        error: S.String,
    }
)
export const ClickedDeleteNewsletterDraft = taggedStruct(
    "ClickedDeleteNewsletterDraft"
)
export const UpdatedNewsletterTestRecipient = taggedStruct(
    "UpdatedNewsletterTestRecipient",
    {
        field: S.Literals(["name", "email"]),
        value: S.String,
    }
)
export const ClickedSendNewsletterTest = taggedStruct(
    "ClickedSendNewsletterTest"
)
export const ClickedSendNewsletterSubscribers = taggedStruct(
    "ClickedSendNewsletterSubscribers"
)
export const CancelledNewsletterSubscriberSend = taggedStruct(
    "CancelledNewsletterSubscriberSend"
)

export const NewsletterDraftsLoaded = taggedStruct("NewsletterDraftsLoaded", {
    drafts: S.Array(SavedNewsletterDraft),
})
export const NewsletterDraftSaved = taggedStruct("NewsletterDraftSaved", {
    draft: SavedNewsletterDraft,
})
export const NewsletterDraftDeleted = taggedStruct("NewsletterDraftDeleted", {
    draftId: S.String,
})
export const NewsletterRecipientsLoaded = taggedStruct(
    "NewsletterRecipientsLoaded",
    {
        recipients: S.Array(NewsletterRecipient),
    }
)
export const NewsletterSendsLoaded = taggedStruct("NewsletterSendsLoaded", {
    sends: S.Array(NewsletterSendSummary),
})
export const NewsletterDispatchCompleted = taggedStruct(
    "NewsletterDispatchCompleted",
    {
        send: NewsletterSendSummary,
    }
)
export const NewsletterDispatchFailed = taggedStruct(
    "NewsletterDispatchFailed",
    {
        error: S.String,
    }
)
export const NewsletterDraftActionFailed = taggedStruct(
    "NewsletterDraftActionFailed",
    {
        action: S.Literals(["load", "save", "delete", "recipients", "sends"]),
        error: S.String,
    }
)

export const Message = S.Union([
    UpdatedNewsletterDraft,
    GotNewsletterRichTextEditorMessage,
    ClosedNewsletterImagePicker,
    RequestedNewsletterImageUpload,
    SelectedNewsletterMediaImage,
    AddedNewsletterBlock,
    MovedNewsletterBlock,
    RemovedNewsletterBlock,
    ChangedNewsletterBlockField,
    ChangedNewsletterBlockImage,
    AddedNewsletterGalleryImage,
    MovedNewsletterGalleryImage,
    RemovedNewsletterGalleryImage,
    ToggledNewsletterEditing,
    SelectedNewsletterDraftChanged,
    ClickedNewNewsletterDraft,
    SubmittedNewsletterDraft,
    ChangedNewsletterTemplateMetadata,
    SubmittedNewsletterTemplate,
    NewsletterTemplateSaved,
    NewsletterTemplateSaveFailed,
    ClickedDeleteNewsletterDraft,
    UpdatedNewsletterTestRecipient,
    ClickedSendNewsletterTest,
    ClickedSendNewsletterSubscribers,
    CancelledNewsletterSubscriberSend,
    NewsletterDraftsLoaded,
    NewsletterDraftSaved,
    NewsletterDraftDeleted,
    NewsletterRecipientsLoaded,
    NewsletterSendsLoaded,
    NewsletterDispatchCompleted,
    NewsletterDispatchFailed,
    NewsletterDraftActionFailed,
])

export type Message = typeof Message.Type
