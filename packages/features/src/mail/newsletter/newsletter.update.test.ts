import { describe, expect, test } from "vitest"
import {
    FailedUploadImage,
    UploadedImage,
    SelectedImageFile,
    InsertedRichTextEditorText,
} from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.schema.ts"

import {
    ChangedNewsletterTemplateMetadata,
    AddedNewsletterBlock,
    ChangedNewsletterBlockField,
    ChangedNewsletterBlockImage,
    AddedNewsletterGalleryImage,
    ClickedSendNewsletterSubscribers,
    ClickedSendNewsletterTest,
    ClickedNewNewsletterDraft,
    GotNewsletterRichTextEditorMessage,
    MovedNewsletterBlock,
    MovedNewsletterGalleryImage,
    RemovedNewsletterBlock,
    RemovedNewsletterGalleryImage,
    NewsletterDraftSaved,
    NewsletterDraftsLoaded,
    NewsletterDraftActionFailed,
    NewsletterDispatchFailed,
    NewsletterDispatchCompleted,
    NewsletterRecipientsLoaded,
    SelectedNewsletterDraftChanged,
    NewsletterTemplateSaved,
    SubmittedNewsletterDraft,
    SubmittedNewsletterTemplate,
    ToggledNewsletterEditing,
    UpdatedNewsletterDraft,
    UpdatedNewsletterTestRecipient,
} from "./newsletter.message.ts"
import type { SavedNewsletterDraft } from "./newsletter.model.ts"
import { newsletter_authoring_template } from "./newsletter-authoring-templates.ts"
import {
    init,
    initDeferred,
    open_content_draft,
    has_unsaved_changes,
    update,
} from "./newsletter.update.ts"

const saved_draft: SavedNewsletterDraft = {
    id: "draft-1",
    name: "June update",
    subject: "URM update",
    headline: "Latest from URM",
    body_text: "Draft body",
    cta_url: "",
    cta_label: "",
    list_key: "newsletter",
    template_source: null,
    updated_at: 1,
}

describe("mail newsletter drafts", () => {
    test("reactive updates preserve unsaved copy, its base revision, and preview mode", () => {
        const [initial] = initDeferred()
        const [loaded] = update(
            initial,
            NewsletterDraftsLoaded({ drafts: [saved_draft] })
        )
        const editing = open_content_draft(loaded, saved_draft.id, true)
        const [changed] = update(
            editing,
            UpdatedNewsletterDraft({
                field: "headline",
                value: "Local headline",
            })
        )
        const [preview] = update(changed, ToggledNewsletterEditing())
        const [remote] = update(
            preview,
            NewsletterDraftsLoaded({
                drafts: [
                    {
                        ...saved_draft,
                        headline: "Remote headline",
                        updated_at: 2,
                    },
                ],
            })
        )
        expect(remote.draft.headline).toBe("Local headline")
        expect(remote.base_updated_at).toBe(1)
        expect(remote.editing).toBe(false)
        expect(has_unsaved_changes(remote)).toBe(true)
        const reopened = open_content_draft(remote, saved_draft.id, true)
        expect(reopened.draft.headline).toBe("Local headline")
        const [saving, commands] = update(reopened, SubmittedNewsletterDraft())
        expect(commands[0]?.args).toMatchObject({ expected_updated_at: 1 })
        const [failed] = update(
            saving,
            NewsletterDraftActionFailed({ action: "save", error: "Conflict" })
        )
        expect(failed.saving).toBe(false)
        expect(failed.draft.headline).toBe("Local headline")
        expect(failed.base_updated_at).toBe(1)
        const [discarded] = update(
            failed,
            SelectedNewsletterDraftChanged({ draftId: saved_draft.id })
        )
        expect(discarded.draft.headline).toBe("Remote headline")
        expect(discarded.base_updated_at).toBe(2)
        expect(has_unsaved_changes(discarded)).toBe(false)
    })

    test("keeps a new template draft when saved-draft subscriptions arrive", () => {
        const [initial] = initDeferred()
        const template = newsletter_authoring_template("email.sample.welcome")
        if (template === null) throw new Error("Expected welcome template")
        const creating = open_content_draft(
            initial,
            null,
            true,
            template.template_id,
            template.create()
        )
        const [remote] = update(
            creating,
            NewsletterDraftsLoaded({ drafts: [saved_draft] })
        )
        const synchronized = open_content_draft(
            remote,
            null,
            true,
            template.template_id,
            template.create()
        )
        expect(synchronized.selectedDraftId).toBe("")
        expect(synchronized.draft).toEqual(creating.draft)
        expect(synchronized.creation_template_id).toBe(template.template_id)
    })

    test("blocks duplicate saves and edits during persistence without clearing pending status on unrelated failures", () => {
        const [initial] = initDeferred()
        const [loaded] = update(
            initial,
            NewsletterDraftsLoaded({ drafts: [saved_draft] })
        )
        const [saving] = update(loaded, SubmittedNewsletterDraft())
        expect(update(saving, SubmittedNewsletterDraft())).toEqual([saving, []])
        expect(
            update(
                saving,
                UpdatedNewsletterDraft({ field: "subject", value: "Too late" })
            )
        ).toEqual([saving, []])
        expect(update(saving, AddedNewsletterBlock({ kind: "hero" }))).toEqual([
            saving,
            [],
        ])
        expect(update(saving, ClickedNewNewsletterDraft())).toEqual([
            saving,
            [],
        ])
        const [failed_load] = update(
            saving,
            NewsletterDraftActionFailed({ action: "sends", error: "Offline" })
        )
        expect(failed_load.saving).toBe(true)
    })

    test("surfaces failed uploads, preserves content, and permits an explicit retry", () => {
        const [initial] = initDeferred()
        const [loaded] = update(
            initial,
            NewsletterDraftsLoaded({ drafts: [saved_draft] })
        )
        const file = new globalThis.File(["image"], "test.jpg", {
            type: "image/jpeg",
        })
        const upload = GotNewsletterRichTextEditorMessage({
            message: SelectedImageFile({ file }),
        })
        const [uploading, commands] = update(loaded, upload)
        expect(uploading.uploading).toBe(true)
        expect(commands).toHaveLength(1)
        expect(update(uploading, SubmittedNewsletterDraft())[1]).toEqual([])
        expect(update(uploading, upload)[1]).toEqual([])
        const [failed, retry_commands] = update(
            uploading,
            GotNewsletterRichTextEditorMessage({
                message: FailedUploadImage({ error: "503 unavailable" }),
            })
        )
        expect(failed.uploading).toBe(false)
        expect(failed.error).toContain("503 unavailable")
        expect(failed.draft).toEqual(loaded.draft)
        expect(retry_commands).toEqual([])
        const [retrying] = update(failed, upload)
        const [uploaded] = update(
            retrying,
            GotNewsletterRichTextEditorMessage({
                message: UploadedImage({
                    src: "https://images.example.com/test.jpg",
                    alt: "Test",
                    resolved_src: "https://images.example.com/test.jpg",
                }),
            })
        )
        expect(uploaded.uploading).toBe(false)
        expect(uploaded.error).toBeNull()
        expect(uploaded.draft.body_text).toContain(
            "https://images.example.com/test.jpg"
        )
        expect(has_unsaved_changes(uploaded)).toBe(true)
    })

    test("unsaved preview copy cannot dispatch and failed sends retain the draft without automatic retries", () => {
        const [initial] = initDeferred()
        const [loaded] = update(
            initial,
            NewsletterDraftsLoaded({ drafts: [saved_draft] })
        )
        const [recipients] = update(
            loaded,
            NewsletterRecipientsLoaded({
                recipients: [
                    {
                        contact_id: "contact",
                        name: "Test",
                        email: "test@example.com",
                    },
                ],
            })
        )
        const [changed] = update(
            recipients,
            UpdatedNewsletterDraft({ field: "subject", value: "Not saved" })
        )
        expect(update(changed, ClickedSendNewsletterSubscribers())[1]).toEqual(
            []
        )
        const [confirmed] = update(
            recipients,
            ClickedSendNewsletterSubscribers()
        )
        const [sending, send_commands] = update(
            confirmed,
            ClickedSendNewsletterSubscribers()
        )
        expect(send_commands).toHaveLength(1)
        expect(update(sending, ClickedSendNewsletterSubscribers())[1]).toEqual(
            []
        )
        const [failed, commands] = update(
            sending,
            NewsletterDispatchFailed({ error: "Provider unavailable" })
        )
        expect(failed.sending).toBeNull()
        expect(failed.confirmingSubscriberSend).toBe(false)
        expect(failed.draft).toEqual(recipients.draft)
        expect(failed.error).toBe("Provider unavailable")
        expect(commands).toEqual([])
        expect(update(failed, ClickedSendNewsletterSubscribers())[1]).toEqual(
            []
        )
        const [partial, followups] = update(
            sending,
            NewsletterDispatchCompleted({
                send: {
                    id: "send-1",
                    audience: "subscribers",
                    status: "failed",
                    approved_contact_count: 2,
                    accepted_count: 1,
                    queued_count: 0,
                    sent_count: 1,
                    failed_count: 1,
                    skipped_count: 0,
                    authoring_template_source: null,
                    delivery_template_source: null,
                    created_at: 1,
                    completed_at: 2,
                },
            })
        )
        expect(partial.notice).toBe("Send finished with 1 failure")
        expect(partial.sending).toBeNull()
        expect(partial.sends).toHaveLength(1)
        expect(followups).toEqual([])
    })

    test("starts in preview mode and requests persisted drafts", () => {
        const [model, commands] = init()

        expect(model.editing).toBe(false)
        expect(commands[0]?.name).toBe("LoadNewsletterDrafts")
    })

    test("loads a saved draft without opening the editor", () => {
        const [initial] = initDeferred()
        const [loaded] = update(
            initial,
            NewsletterDraftsLoaded({ drafts: [saved_draft] })
        )

        expect(loaded.selectedDraftId).toBe("draft-1")
        expect(loaded.draft.subject).toBe("URM update")
        expect(loaded.editing).toBe(false)
    })

    test("opens a selected persisted draft through the Content adapter", () => {
        const [initial] = initDeferred()
        const [loaded] = update(
            initial,
            NewsletterDraftsLoaded({ drafts: [saved_draft] })
        )
        const editing = open_content_draft(loaded, "draft-1", true)

        expect(editing.selectedDraftId).toBe("draft-1")
        expect(editing.draft.subject).toBe("URM update")
        expect(editing.editing).toBe(true)
    })

    test("opens a fresh schema-valid built-in template without persistence", () => {
        const [initial] = initDeferred()
        const template = newsletter_authoring_template(
            "email.sample.weekly_digest"
        )

        expect(template).not.toBeNull()
        if (template === null) return
        const first_draft = template.create()
        const second_draft = template.create()
        const creating = open_content_draft(
            initial,
            null,
            true,
            template.template_id,
            first_draft
        )

        expect(first_draft).not.toBe(second_draft)
        expect(creating.creation_template_id).toBe(template.template_id)
        expect(creating.selectedDraftId).toBe("")
        expect(creating.draft.subject).toBe("Your weekly digest")
        expect(creating.editor.document.children).toHaveLength(5)
        expect(creating.editing).toBe(true)

        const [, commands] = update(
            {
                ...creating,
                draft: { ...creating.draft, name: "Weekly digest" },
            },
            SubmittedNewsletterDraft()
        )
        expect(commands[0]?.args).toMatchObject({
            draftId: null,
            template_source: {
                template_id: template.template_id,
                template_version: 1,
                provenance: "builtin",
            },
        })
    })

    test("saves inline edits to the selected draft", () => {
        const [initial] = initDeferred()
        const [loaded] = update(
            initial,
            NewsletterDraftsLoaded({ drafts: [saved_draft] })
        )
        const [editing] = update(loaded, ToggledNewsletterEditing())
        const [changed] = update(
            editing,
            UpdatedNewsletterDraft({
                field: "headline",
                value: "A new headline",
            })
        )
        const [, commands] = update(changed, SubmittedNewsletterDraft())

        expect(commands[0]?.name).toBe("SaveNewsletterDraft")
        expect(commands[0]?.args).toEqual({
            draftId: "draft-1",
            expected_updated_at: 1,
            template_source: null,
            draft: {
                name: "June update",
                subject: "URM update",
                headline: "A new headline",
                body_text:
                    '{"schema_version":2,"blocks":[{"block_id":"body","type":"rich_text","document":{"type":"doc","children":[{"type":"paragraph","children":[{"type":"text","text":"Draft body"}]}]}}]}',
                cta_url: "",
                cta_label: "",
                list_key: "newsletter",
            },
        })
    })

    test("creates a separate unsaved draft", () => {
        const [initial] = initDeferred()
        const [creating] = update(initial, ClickedNewNewsletterDraft())
        const [named] = update(
            creating,
            UpdatedNewsletterDraft({ field: "name", value: "New draft" })
        )
        const [, commands] = update(named, SubmittedNewsletterDraft())

        expect(commands[0]?.args).toEqual({
            draftId: null,
            expected_updated_at: 0,
            template_source: null,
            draft: {
                name: "New draft",
                subject: "",
                headline: "",
                body_text:
                    '{"schema_version":2,"blocks":[{"block_id":"body","type":"rich_text","document":{"type":"doc","children":[{"type":"paragraph","children":[{"type":"text","text":""}]}]}}]}',
                cta_url: "",
                cta_label: "",
                list_key: "newsletter",
            },
        })
    })

    test("returns to preview mode after persistence succeeds", () => {
        const [initial] = initDeferred()
        const [saved] = update(
            { ...initial, editing: true, saving: true },
            NewsletterDraftSaved({ draft: saved_draft })
        )

        expect(saved.editing).toBe(false)
        expect(saved.saving).toBe(false)
        expect(saved.drafts).toEqual([saved_draft])
    })

    test("stores rich-text changes in the versioned body envelope", () => {
        const [initial] = initDeferred()
        const [edited] = update(
            initial,
            GotNewsletterRichTextEditorMessage({
                message: InsertedRichTextEditorText({ value: "Hello" }),
            })
        )

        expect(edited.draft.body_text).toBe(
            '{"schema_version":2,"blocks":[{"block_id":"body","type":"rich_text","document":{"type":"doc","children":[{"type":"paragraph","children":[{"type":"text","text":"Hello"}]}]}}]}'
        )
    })

    test("adds, edits, reorders, and removes visual email blocks", () => {
        const [initial] = initDeferred()
        const [with_hero] = update(
            initial,
            AddedNewsletterBlock({ kind: "hero" })
        )
        const hero = with_hero.block_document.blocks[1]

        expect(hero?.type).toBe("hero")
        if (hero === undefined) return
        const [edited] = update(
            with_hero,
            ChangedNewsletterBlockField({
                block_id: hero.block_id,
                field: "heading",
                value: "Featured story",
            })
        )
        const [moved] = update(
            edited,
            MovedNewsletterBlock({
                block_id: hero.block_id,
                direction: "up",
            })
        )
        const [removed] = update(
            moved,
            RemovedNewsletterBlock({ block_id: hero.block_id })
        )

        expect(moved.block_document.blocks[0]).toMatchObject({
            type: "hero",
            heading: "Featured story",
        })
        expect(removed.block_document.blocks).toHaveLength(1)
        expect(removed.block_document.blocks[0]?.type).toBe("rich_text")
        expect(JSON.parse(removed.draft.body_text)).toMatchObject({
            schema_version: 2,
        })
    })

    test("edits and orders gallery images without losing block identity", () => {
        const [initial] = initDeferred()
        const [with_gallery] = update(
            initial,
            AddedNewsletterBlock({ kind: "gallery" })
        )
        const gallery = with_gallery.block_document.blocks[1]

        expect(gallery?.type).toBe("gallery")
        if (gallery === undefined || gallery.type !== "gallery") return
        const [with_second_image] = update(
            with_gallery,
            AddedNewsletterGalleryImage({ block_id: gallery.block_id })
        )
        const updated_gallery = with_second_image.block_document.blocks[1]
        if (updated_gallery?.type !== "gallery") return
        const second_image = updated_gallery.images[1]
        if (second_image === undefined) return
        const [edited] = update(
            with_second_image,
            ChangedNewsletterBlockImage({
                block_id: gallery.block_id,
                image_id: second_image.image_id,
                field: "src",
                value: "https://images.example.com/second.jpg",
            })
        )
        const [moved] = update(
            edited,
            MovedNewsletterGalleryImage({
                block_id: gallery.block_id,
                image_id: second_image.image_id,
                direction: "up",
            })
        )
        const moved_gallery = moved.block_document.blocks[1]

        expect(moved_gallery?.type).toBe("gallery")
        expect(
            moved_gallery?.type === "gallery"
                ? moved_gallery.images[0]
                : undefined
        ).toMatchObject({
            image_id: second_image.image_id,
            src: "https://images.example.com/second.jpg",
        })
        const [removed] = update(
            moved,
            RemovedNewsletterGalleryImage({
                block_id: gallery.block_id,
                image_id: second_image.image_id,
            })
        )
        const remaining_gallery = removed.block_document.blocks[1]
        expect(
            remaining_gallery?.type === "gallery"
                ? remaining_gallery.images
                : []
        ).toHaveLength(1)
    })

    test("saves current authoring fields as an organization template", () => {
        const [initial] = initDeferred()
        const [loaded] = update(
            initial,
            NewsletterDraftsLoaded({ drafts: [saved_draft] })
        )
        const [named] = update(
            loaded,
            ChangedNewsletterTemplateMetadata({
                field: "name",
                value: "Monthly update",
            })
        )
        const [tagged] = update(
            named,
            ChangedNewsletterTemplateMetadata({
                field: "tags",
                value: "Newsletter, Customers",
            })
        )
        const [saving, commands] = update(tagged, SubmittedNewsletterTemplate())

        expect(saving.templateSaveStatus).toBe("saving")
        expect(commands[0]?.name).toBe("SaveNewsletterTemplate")
        expect(commands[0]?.args).toMatchObject({
            name: "Monthly update",
            description: "Reusable newsletter template.",
            tags: ["Newsletter", "Customers"],
            subject: "URM update",
            headline: "Latest from URM",
            cta_url: null,
            cta_label: null,
        })

        const [saved] = update(saving, NewsletterTemplateSaved())
        expect(saved.templateSaveStatus).toBe("idle")
        expect(saved.notice).toBe("Template saved")
    })

    test("validates and requests a test send from preview mode", () => {
        const [initial] = initDeferred()
        const [loaded] = update(
            initial,
            NewsletterDraftsLoaded({ drafts: [saved_draft] })
        )
        const [named] = update(
            loaded,
            UpdatedNewsletterTestRecipient({
                field: "name",
                value: "Matthias",
            })
        )
        const [addressed] = update(
            named,
            UpdatedNewsletterTestRecipient({
                field: "email",
                value: "matthias@example.com",
            })
        )
        const [sending, commands] = update(
            addressed,
            ClickedSendNewsletterTest()
        )

        expect(sending.sending).toBe("test")
        expect(commands[0]?.name).toBe("SendNewsletterTest")
    })

    test("requires an explicit second click for a subscriber send", () => {
        const [initial] = initDeferred()
        const [loaded] = update(
            {
                ...initial,
                recipients: [
                    {
                        contact_id: "contact-1",
                        name: "Subscriber",
                        email: "subscriber@example.com",
                    },
                ],
            },
            NewsletterDraftsLoaded({ drafts: [saved_draft] })
        )
        const [confirming, first_commands] = update(
            loaded,
            ClickedSendNewsletterSubscribers()
        )
        const [sending, second_commands] = update(
            confirming,
            ClickedSendNewsletterSubscribers()
        )

        expect(confirming.confirmingSubscriberSend).toBe(true)
        expect(first_commands).toEqual([])
        expect(sending.sending).toBe("subscribers")
        expect(second_commands[0]?.name).toBe("SendNewsletterSubscribers")
    })
})
