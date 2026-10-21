import { Array, Match as M, Option, Schema as S, Stream } from "effect"
import { Command, Subscription } from "foldkit"
import {
    decodeEmailNewsletterBlockContent,
    decodeEmailNewsletterContent,
    emailNewsletterBlocksPlainText,
    emailNewsletterPlainText,
    encodeEmailNewsletterBlockContent,
    replaceEmailNewsletterPrimaryRichText,
    type EmailNewsletterBlock,
    type EmailNewsletterDocument,
    type EmailNewsletterExternalImage,
} from "@urm/email/newsletter-content"
import {
    ContentTemplateDescription,
    ContentTemplateName,
    ContentTemplateTags,
} from "@urm/domain/schemas/content-templates"
import {
    initRichTextEditor,
    richTextEditorSubscriptions,
    unmountRichTextEditorHost,
    updateRichTextEditor,
} from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.view.ts"
import {
    RichTextEditorModel,
    ClickedRichTextEditorImage,
    ClosedRichTextEditorSlashMenu,
    UploadedImage,
    type RichTextEditorMessage,
} from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.schema.ts"

import {
    blankNewsletterDraft,
    blankNewsletterBlockDocument,
    blankNewsletterEditor,
    type Model,
    type SavedNewsletterDraft,
} from "./newsletter.model.ts"
import type { Message } from "./newsletter.message.ts"
import { GotNewsletterRichTextEditorMessage } from "./newsletter.message.ts"
import {
    DeleteNewsletterDraft,
    LoadNewsletterDrafts,
    LoadNewsletterSends,
    SaveNewsletterDraft,
    SaveNewsletterTemplate,
    SendNewsletterSubscribers,
    SendNewsletterTest,
} from "./newsletter.command.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

const is_blank = (value: string) => value.trim().length === 0

const template_tags = (value: string): ReadonlyArray<string> =>
    value
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)

const nullable_text = (value: string): string | null => {
    const trimmed = value.trim()
    return trimmed === "" ? null : trimmed
}

const can_save = (model: Model): boolean =>
    !model.saving &&
    !model.uploading &&
    !is_blank(model.draft.name) &&
    !is_blank(model.draft.list_key)

const can_dispatch = (model: Model): boolean =>
    model.selectedDraftId !== "" &&
    !model.editing &&
    !model.saving &&
    !model.uploading &&
    !has_unsaved_changes(model) &&
    model.sending === null &&
    !is_blank(model.draft.subject) &&
    !is_blank(model.draft.headline) &&
    !is_blank(emailNewsletterBlocksPlainText(model.block_document))

const valid_email = (value: string): boolean =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

const to_draft = (saved: SavedNewsletterDraft): Model["draft"] => ({
    name: saved.name,
    subject: saved.subject,
    headline: saved.headline,
    body_text: saved.body_text,
    cta_url: saved.cta_url,
    cta_label: saved.cta_label,
    list_key: saved.list_key,
})

const editor_for_body = (body_text: string): RichTextEditorModel => {
    const document = decodeEmailNewsletterContent(body_text)
    return {
        ...initRichTextEditor(emailNewsletterPlainText(document)),
        document,
    }
}

const block_document_for_body = (body_text: string): EmailNewsletterDocument =>
    decodeEmailNewsletterBlockContent(body_text)

export const has_unsaved_changes = (model: Model): boolean => {
    const base = model.base_draft ?? blankNewsletterDraft()
    return (
        model.draft.name !== base.name ||
        model.draft.subject !== base.subject ||
        model.draft.headline !== base.headline ||
        model.draft.cta_url !== base.cta_url ||
        model.draft.cta_label !== base.cta_label ||
        model.draft.list_key !== base.list_key ||
        encodeEmailNewsletterBlockContent(model.block_document) !==
            encodeEmailNewsletterBlockContent(
                block_document_for_body(base.body_text)
            )
    )
}

const next_block_id_for = (document: EmailNewsletterDocument): number =>
    document.blocks.reduce((largest_id, block) => {
        const match = /^email-block-(\d+)$/.exec(block.block_id)
        if (match === null) return largest_id
        const numeric_id = Number(match[1])
        return Number.isSafeInteger(numeric_id)
            ? Math.max(largest_id, numeric_id + 1)
            : largest_id
    }, 2)

const sync_document_to_draft = (
    model: Model,
    block_document: EmailNewsletterDocument
): Pick<Model, "block_document" | "draft"> => ({
    block_document,
    draft: {
        ...model.draft,
        body_text: encodeEmailNewsletterBlockContent(block_document),
    },
})

const draft_with_editor_content = (model: Model): Model["draft"] => ({
    ...model.draft,
    body_text: encodeEmailNewsletterBlockContent(
        replaceEmailNewsletterPrimaryRichText(
            model.block_document,
            model.editor.document
        )
    ),
})

const empty_external_image = (
    image_id: string
): EmailNewsletterExternalImage => ({
    image_id,
    source: "external_https",
    src: "",
    alt: "",
})

const new_block = (
    kind:
        | "hero"
        | "call_to_action"
        | "testimonial"
        | "article_card"
        | "gallery",
    block_id: string
): EmailNewsletterBlock => {
    switch (kind) {
        case "hero":
            return {
                block_id,
                type: "hero",
                eyebrow: "Featured",
                heading: "A clear headline",
                body: "Explain the most important message for your readers.",
            }
        case "call_to_action":
            return {
                block_id,
                type: "call_to_action",
                heading: "Ready to continue?",
                body: "Explain what readers can expect after following the link.",
                label: "Learn more",
                url: "",
            }
        case "testimonial":
            return {
                block_id,
                type: "testimonial",
                quote: "Add a short customer quote.",
                attribution: "Customer name",
            }
        case "article_card":
            return {
                block_id,
                type: "article_card",
                image: empty_external_image(`${block_id}-image`),
                kicker: "Article",
                heading: "Article headline",
                summary: "Summarize why this article is useful to readers.",
                link_label: "Read more",
                url: "",
            }
        case "gallery":
            return {
                block_id,
                type: "gallery",
                images: [empty_external_image("gallery-image-1")],
            }
    }
}

const move_block = (
    document: EmailNewsletterDocument,
    block_id: string,
    direction: "up" | "down"
): EmailNewsletterDocument => {
    const index = document.blocks.findIndex(
        (block) => block.block_id === block_id
    )
    const next_index = direction === "up" ? index - 1 : index + 1
    if (index === -1 || next_index < 0 || next_index >= document.blocks.length)
        return document

    return {
        ...document,
        blocks: document.blocks.map((block, block_index) =>
            block_index === index
                ? (document.blocks[next_index] ?? block)
                : block_index === next_index
                  ? (document.blocks[index] ?? block)
                  : block
        ),
    }
}

const change_block_field = (
    block: EmailNewsletterBlock,
    field:
        | "eyebrow"
        | "heading"
        | "body"
        | "label"
        | "url"
        | "quote"
        | "attribution"
        | "kicker"
        | "summary"
        | "link_label",
    value: string
): EmailNewsletterBlock => {
    switch (block.type) {
        case "rich_text":
            return block
        case "hero":
            switch (field) {
                case "eyebrow":
                    return { ...block, eyebrow: value }
                case "heading":
                    return { ...block, heading: value }
                case "body":
                    return { ...block, body: value }
                default:
                    return block
            }
        case "call_to_action":
            switch (field) {
                case "heading":
                    return { ...block, heading: value }
                case "body":
                    return { ...block, body: value }
                case "label":
                    return { ...block, label: value }
                case "url":
                    return { ...block, url: value }
                default:
                    return block
            }
        case "testimonial":
            switch (field) {
                case "quote":
                    return { ...block, quote: value }
                case "attribution":
                    return { ...block, attribution: value }
                default:
                    return block
            }
        case "article_card":
            switch (field) {
                case "kicker":
                    return { ...block, kicker: value }
                case "heading":
                    return { ...block, heading: value }
                case "summary":
                    return { ...block, summary: value }
                case "link_label":
                    return { ...block, link_label: value }
                case "url":
                    return { ...block, url: value }
                default:
                    return block
            }
        case "gallery":
            return block
    }
}

const change_block_image = (
    block: EmailNewsletterBlock,
    image_id: string,
    field: "src" | "alt",
    value: string
): EmailNewsletterBlock => {
    if (block.type === "article_card") {
        if (block.image.image_id !== image_id) return block
        return {
            ...block,
            image: {
                ...block.image,
                src: field === "src" ? value : block.image.src,
                alt: field === "alt" ? value : block.image.alt,
            },
        }
    }
    if (block.type !== "gallery") return block
    return {
        ...block,
        images: block.images.map((image) =>
            image.image_id === image_id
                ? {
                      ...image,
                      src: field === "src" ? value : image.src,
                      alt: field === "alt" ? value : image.alt,
                  }
                : image
        ),
    }
}

const next_gallery_image_id = (block: EmailNewsletterBlock): string => {
    if (block.type !== "gallery") return "gallery-image-1"
    const next_id = block.images.reduce((largest_id, image) => {
        const match = /^gallery-image-(\d+)$/.exec(image.image_id)
        if (match === null) return largest_id
        const numeric_id = Number(match[1])
        return Number.isSafeInteger(numeric_id)
            ? Math.max(largest_id, numeric_id + 1)
            : largest_id
    }, 1)
    return `gallery-image-${next_id}`
}

const move_gallery_image = (
    block: EmailNewsletterBlock,
    image_id: string,
    direction: "up" | "down"
): EmailNewsletterBlock => {
    if (block.type !== "gallery") return block
    const index = block.images.findIndex((image) => image.image_id === image_id)
    const next_index = direction === "up" ? index - 1 : index + 1
    if (index === -1 || next_index < 0 || next_index >= block.images.length)
        return block

    return {
        ...block,
        images: block.images.map((image, image_index) =>
            image_index === index
                ? (block.images[next_index] ?? image)
                : image_index === next_index
                  ? (block.images[index] ?? image)
                  : image
        ),
    }
}

const map_editor_commands = (
    commands: ReadonlyArray<Command.Command<RichTextEditorMessage>>
): ReadonlyArray<Command.Command<Message>> =>
    Command.mapMessages(commands, (message) =>
        GotNewsletterRichTextEditorMessage({ message })
    )

export const open_content_draft = (
    model: Model,
    draft_id: string | null,
    editing: boolean,
    creation_template_id: string | null = null,
    creation_draft: Model["draft"] = blankNewsletterDraft()
): Model => {
    if (draft_id === null) {
        if (
            model.selectedDraftId === "" &&
            model.creation_template_id === creation_template_id &&
            (model.editing ||
                has_unsaved_changes(model) ||
                model.saving ||
                model.uploading)
        )
            return model
        return {
            ...model,
            selectedDraftId: "",
            creation_template_id,
            draft: creation_draft,
            base_draft: null,
            base_updated_at: 0,
            uploading: false,
            image_picker_open: false,
            block_document: block_document_for_body(creation_draft.body_text),
            next_block_id: next_block_id_for(
                block_document_for_body(creation_draft.body_text)
            ),
            editor: editor_for_body(creation_draft.body_text),
            recipients: [],
            editing: true,
            error: null,
            notice: null,
            confirmingSubscriberSend: false,
            templateName: "",
            templateDescription: "Reusable newsletter template.",
            templateTags: "",
            templateSaveStatus: "idle",
        }
    }

    if (model.selectedDraftId === draft_id && model.base_draft !== null)
        return { ...model, editing, image_picker_open: false }
    const selected = model.drafts.find((draft) => draft.id === draft_id)
    if (selected === undefined) {
        return model.loading
            ? model
            : {
                  ...model,
                  selectedDraftId: "",
                  creation_template_id: null,
                  draft: blankNewsletterDraft(),
                  base_draft: null,
                  base_updated_at: 0,
                  uploading: false,
                  image_picker_open: false,
                  block_document: blankNewsletterBlockDocument(),
                  next_block_id: 2,
                  editor: blankNewsletterEditor(),
                  editing: false,
                  error: "Email draft not found",
                  notice: null,
              }
    }

    return {
        ...model,
        selectedDraftId: selected.id,
        creation_template_id: null,
        draft: to_draft(selected),
        base_draft: to_draft(selected),
        base_updated_at: selected.updated_at,
        uploading: false,
        image_picker_open: false,
        block_document: block_document_for_body(selected.body_text),
        next_block_id: next_block_id_for(
            block_document_for_body(selected.body_text)
        ),
        editor: editor_for_body(selected.body_text),
        recipients: [],
        editing,
        error: null,
        notice: null,
        confirmingSubscriberSend: false,
    }
}

export const close_content_authoring = (model: Model): Model => ({
    ...model,
    editor: unmountRichTextEditorHost(model.editor),
    editing: false,
    image_picker_open: false,
    confirmingSubscriberSend: false,
})

const replace_draft = (
    drafts: Model["drafts"],
    incoming: SavedNewsletterDraft
): Model["drafts"] =>
    Array.some(drafts, ({ id }) => id === incoming.id)
        ? Array.map(drafts, (draft) =>
              draft.id === incoming.id ? incoming : draft
          )
        : [incoming, ...drafts]

const select_after_delete = (
    drafts: Model["drafts"],
    draft_id: string
): Pick<
    Model,
    | "drafts"
    | "selectedDraftId"
    | "creation_template_id"
    | "draft"
    | "base_draft"
    | "base_updated_at"
    | "uploading"
    | "image_picker_open"
    | "block_document"
    | "next_block_id"
    | "editor"
> => {
    const remaining = drafts.filter(({ id }) => id !== draft_id)
    const first = remaining[0]

    return first === undefined
        ? {
              drafts: remaining,
              selectedDraftId: "",
              creation_template_id: null,
              draft: blankNewsletterDraft(),
              base_draft: null,
              base_updated_at: 0,
              uploading: false,
              image_picker_open: false,
              block_document: blankNewsletterBlockDocument(),
              next_block_id: 2,
              editor: blankNewsletterEditor(),
          }
        : {
              drafts: remaining,
              selectedDraftId: first.id,
              creation_template_id: null,
              draft: to_draft(first),
              base_draft: to_draft(first),
              base_updated_at: first.updated_at,
              uploading: false,
              image_picker_open: false,
              block_document: block_document_for_body(first.body_text),
              next_block_id: next_block_id_for(
                  block_document_for_body(first.body_text)
              ),
              editor: editor_for_body(first.body_text),
          }
}

export const initDeferred = (): UpdateReturn => [
    {
        publication_theme: null,
        drafts: [],
        selectedDraftId: "",
        creation_template_id: null,
        draft: blankNewsletterDraft(),
        base_draft: null,
        base_updated_at: 0,
        uploading: false,
        image_picker_open: false,
        block_document: blankNewsletterBlockDocument(),
        next_block_id: 2,
        editor: blankNewsletterEditor(),
        recipients: [],
        sends: [],
        testRecipientName: "",
        testRecipientEmail: "",
        sending: null,
        confirmingSubscriberSend: false,
        editing: false,
        loading: false,
        saving: false,
        templateName: "",
        templateDescription: "Reusable newsletter template.",
        templateTags: "",
        templateSaveStatus: "idle",
        error: null,
        notice: null,
    },
    [],
]

export const init = (): UpdateReturn => {
    const [model] = initDeferred()

    return [
        { ...model, loading: true },
        [LoadNewsletterDrafts(), LoadNewsletterSends()],
    ]
}

const update_message = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            UpdatedNewsletterDraft: ({ field, value }) => [
                {
                    ...model,
                    draft: { ...model.draft, [field]: value },
                    block_document:
                        field === "body_text"
                            ? block_document_for_body(value)
                            : model.block_document,
                    editor:
                        field === "body_text"
                            ? editor_for_body(value)
                            : model.editor,
                    error: null,
                    notice: null,
                    confirmingSubscriberSend: false,
                },
                [],
            ],
            GotNewsletterRichTextEditorMessage: ({ message }) => {
                if (message._tag === "ClickedRichTextEditorImage")
                    return [
                        { ...model, image_picker_open: true, error: null },
                        [],
                    ]
                if (
                    message._tag === "SelectedRichTextEditorSlashCommand" &&
                    message.value === "image"
                ) {
                    const [editor] = updateRichTextEditor(
                        model.editor,
                        ClosedRichTextEditorSlashMenu()
                    )
                    return [
                        {
                            ...model,
                            editor,
                            image_picker_open: true,
                            error: null,
                        },
                        [],
                    ]
                }
                if (message._tag === "FailedUploadImage")
                    return [
                        {
                            ...model,
                            uploading: false,
                            error: `Could not upload or load image: ${message.error}`,
                            notice: null,
                        },
                        [],
                    ]
                if (message._tag === "UploadedImage" && !model.uploading)
                    return [model, []]
                if (message._tag === "SelectedImageFile" && model.uploading)
                    return [model, []]
                const [editor, commands] = updateRichTextEditor(
                    model.editor,
                    message
                )
                return [
                    {
                        ...model,
                        editor,
                        uploading:
                            message._tag === "SelectedImageFile"
                                ? true
                                : message._tag === "UploadedImage"
                                  ? false
                                  : model.uploading,
                        ...(editor.document === model.editor.document
                            ? {}
                            : sync_document_to_draft(
                                  model,
                                  replaceEmailNewsletterPrimaryRichText(
                                      model.block_document,
                                      editor.document
                                  )
                              )),
                        error: null,
                        notice: null,
                    },
                    map_editor_commands(commands),
                ]
            },
            ClosedNewsletterImagePicker: () => [
                { ...model, image_picker_open: false },
                [],
            ],
            RequestedNewsletterImageUpload: () => {
                const [editor, commands] = updateRichTextEditor(
                    model.editor,
                    ClickedRichTextEditorImage()
                )
                return [
                    { ...model, image_picker_open: false, editor },
                    map_editor_commands(commands),
                ]
            },
            SelectedNewsletterMediaImage: ({ src, url, alt }) => {
                const [editor, commands] = updateRichTextEditor(
                    model.editor,
                    UploadedImage({ src, alt, resolved_src: url })
                )
                return [
                    {
                        ...model,
                        image_picker_open: false,
                        editor,
                        ...sync_document_to_draft(
                            model,
                            replaceEmailNewsletterPrimaryRichText(
                                model.block_document,
                                editor.document
                            )
                        ),
                        error: null,
                        notice: null,
                    },
                    map_editor_commands(commands),
                ]
            },
            AddedNewsletterBlock: ({ kind }) => {
                const block_document = {
                    ...model.block_document,
                    blocks: [
                        ...model.block_document.blocks,
                        new_block(kind, `email-block-${model.next_block_id}`),
                    ],
                }
                return [
                    {
                        ...model,
                        ...sync_document_to_draft(model, block_document),
                        next_block_id: model.next_block_id + 1,
                        error: null,
                        notice: null,
                    },
                    [],
                ]
            },
            MovedNewsletterBlock: ({ block_id, direction }) => [
                {
                    ...model,
                    ...sync_document_to_draft(
                        model,
                        move_block(model.block_document, block_id, direction)
                    ),
                    error: null,
                    notice: null,
                },
                [],
            ],
            RemovedNewsletterBlock: ({ block_id }) => {
                const block = model.block_document.blocks.find(
                    (candidate) => candidate.block_id === block_id
                )
                if (block === undefined || block.type === "rich_text")
                    return [model, []]
                const block_document = {
                    ...model.block_document,
                    blocks: model.block_document.blocks.filter(
                        (candidate) => candidate.block_id !== block_id
                    ),
                }
                return [
                    {
                        ...model,
                        ...sync_document_to_draft(model, block_document),
                        error: null,
                        notice: null,
                    },
                    [],
                ]
            },
            ChangedNewsletterBlockField: ({ block_id, field, value }) => {
                const block_document = {
                    ...model.block_document,
                    blocks: model.block_document.blocks.map((block) =>
                        block.block_id === block_id
                            ? change_block_field(block, field, value)
                            : block
                    ),
                }
                return [
                    {
                        ...model,
                        ...sync_document_to_draft(model, block_document),
                        error: null,
                        notice: null,
                    },
                    [],
                ]
            },
            ChangedNewsletterBlockImage: ({
                block_id,
                image_id,
                field,
                value,
            }) => {
                const block_document = {
                    ...model.block_document,
                    blocks: model.block_document.blocks.map((block) =>
                        block.block_id === block_id
                            ? change_block_image(block, image_id, field, value)
                            : block
                    ),
                }
                return [
                    {
                        ...model,
                        ...sync_document_to_draft(model, block_document),
                        error: null,
                        notice: null,
                    },
                    [],
                ]
            },
            AddedNewsletterGalleryImage: ({ block_id }) => {
                const gallery = model.block_document.blocks.find(
                    (block) => block.block_id === block_id
                )
                if (
                    gallery === undefined ||
                    gallery.type !== "gallery" ||
                    gallery.images.length >= 6
                )
                    return [model, []]
                const block_document = {
                    ...model.block_document,
                    blocks: model.block_document.blocks.map((block) =>
                        block.block_id === block_id && block.type === "gallery"
                            ? {
                                  ...block,
                                  images: [
                                      ...block.images,
                                      empty_external_image(
                                          next_gallery_image_id(block)
                                      ),
                                  ],
                              }
                            : block
                    ),
                }
                return [
                    {
                        ...model,
                        ...sync_document_to_draft(model, block_document),
                        error: null,
                        notice: null,
                    },
                    [],
                ]
            },
            MovedNewsletterGalleryImage: ({
                block_id,
                image_id,
                direction,
            }) => {
                const block_document = {
                    ...model.block_document,
                    blocks: model.block_document.blocks.map((block) =>
                        block.block_id === block_id
                            ? move_gallery_image(block, image_id, direction)
                            : block
                    ),
                }
                return [
                    {
                        ...model,
                        ...sync_document_to_draft(model, block_document),
                        error: null,
                        notice: null,
                    },
                    [],
                ]
            },
            RemovedNewsletterGalleryImage: ({ block_id, image_id }) => {
                const block_document = {
                    ...model.block_document,
                    blocks: model.block_document.blocks.map((block) =>
                        block.block_id === block_id && block.type === "gallery"
                            ? {
                                  ...block,
                                  images: block.images.filter(
                                      (image) => image.image_id !== image_id
                                  ),
                              }
                            : block
                    ),
                }
                return [
                    {
                        ...model,
                        ...sync_document_to_draft(model, block_document),
                        error: null,
                        notice: null,
                    },
                    [],
                ]
            },
            ToggledNewsletterEditing: () => [
                {
                    ...model,
                    editing: !model.editing,
                    image_picker_open: false,
                    editor: model.editing
                        ? unmountRichTextEditorHost(model.editor)
                        : model.editor,
                    error: null,
                    confirmingSubscriberSend: false,
                },
                [],
            ],
            SelectedNewsletterDraftChanged: ({ draftId }) => {
                const selected = model.drafts.find(({ id }) => id === draftId)

                return selected === undefined
                    ? [model, []]
                    : [
                          {
                              ...model,
                              selectedDraftId: selected.id,
                              creation_template_id: null,
                              draft: to_draft(selected),
                              base_draft: to_draft(selected),
                              base_updated_at: selected.updated_at,
                              uploading: false,
                              image_picker_open: false,
                              block_document: block_document_for_body(
                                  selected.body_text
                              ),
                              next_block_id: next_block_id_for(
                                  block_document_for_body(selected.body_text)
                              ),
                              editor: editor_for_body(selected.body_text),
                              recipients: [],
                              editing: false,
                              error: null,
                              notice: null,
                              confirmingSubscriberSend: false,
                          },
                          [],
                      ]
            },
            ClickedNewNewsletterDraft: () => [
                {
                    ...model,
                    selectedDraftId: "",
                    creation_template_id: null,
                    draft: blankNewsletterDraft(),
                    base_draft: null,
                    base_updated_at: 0,
                    uploading: false,
                    image_picker_open: false,
                    block_document: blankNewsletterBlockDocument(),
                    next_block_id: 2,
                    editor: blankNewsletterEditor(),
                    recipients: [],
                    editing: true,
                    error: null,
                    notice: null,
                    confirmingSubscriberSend: false,
                },
                [],
            ],
            SubmittedNewsletterDraft: () =>
                can_save(model)
                    ? [
                          {
                              ...model,
                              saving: true,
                              error: null,
                              notice: null,
                          },
                          [
                              SaveNewsletterDraft({
                                  expected_updated_at: model.base_updated_at,
                                  draftId:
                                      model.selectedDraftId === ""
                                          ? null
                                          : model.selectedDraftId,
                                  draft: draft_with_editor_content(model),
                                  template_source:
                                      model.selectedDraftId !== "" ||
                                      model.creation_template_id === null
                                          ? null
                                          : {
                                                template_id:
                                                    model.creation_template_id,
                                                template_version: 1,
                                                provenance: "builtin",
                                            },
                              }),
                          ],
                      ]
                    : [
                          {
                              ...model,
                              error: model.uploading
                                  ? "Wait for the image upload to finish before saving."
                                  : "Draft name and list key are required",
                          },
                          [],
                      ],
            ChangedNewsletterTemplateMetadata: ({ field, value }) => [
                {
                    ...model,
                    templateName: field === "name" ? value : model.templateName,
                    templateDescription:
                        field === "description"
                            ? value
                            : model.templateDescription,
                    templateTags: field === "tags" ? value : model.templateTags,
                    templateSaveStatus: "idle",
                    error: null,
                    notice: null,
                },
                [],
            ],
            SubmittedNewsletterTemplate: () => {
                if (model.templateSaveStatus === "saving") return [model, []]
                if (model.uploading)
                    return [
                        {
                            ...model,
                            error: "Wait for the image upload to finish before saving a template.",
                        },
                        [],
                    ]
                const name = S.decodeUnknownOption(ContentTemplateName)(
                    model.templateName.trim()
                )
                const description = S.decodeUnknownOption(
                    ContentTemplateDescription
                )(model.templateDescription.trim())
                const tags = S.decodeUnknownOption(ContentTemplateTags)(
                    template_tags(model.templateTags)
                )
                if (
                    Option.isNone(name) ||
                    Option.isNone(description) ||
                    Option.isNone(tags)
                ) {
                    return [
                        {
                            ...model,
                            error: "Enter a template name and use no more than 12 tags of 40 characters each.",
                            notice: null,
                        },
                        [],
                    ]
                }
                return [
                    {
                        ...model,
                        templateSaveStatus: "saving",
                        error: null,
                        notice: null,
                    },
                    [
                        SaveNewsletterTemplate({
                            name: name.value,
                            description: description.value,
                            tags: tags.value,
                            subject: model.draft.subject,
                            headline: model.draft.headline,
                            body_text:
                                draft_with_editor_content(model).body_text,
                            cta_url: nullable_text(model.draft.cta_url),
                            cta_label: nullable_text(model.draft.cta_label),
                        }),
                    ],
                ]
            },
            NewsletterTemplateSaved: () => [
                {
                    ...model,
                    templateName: "",
                    templateDescription: "Reusable newsletter template.",
                    templateTags: "",
                    templateSaveStatus: "idle",
                    error: null,
                    notice: "Template saved",
                },
                [],
            ],
            NewsletterTemplateSaveFailed: ({ error }) => [
                {
                    ...model,
                    templateSaveStatus: "idle",
                    error: `Could not save template: ${error}`,
                    notice: null,
                },
                [],
            ],
            ClickedDeleteNewsletterDraft: () =>
                model.selectedDraftId === ""
                    ? [model, []]
                    : [
                          { ...model, saving: true, error: null, notice: null },
                          [
                              DeleteNewsletterDraft({
                                  draftId: model.selectedDraftId,
                              }),
                          ],
                      ],
            NewsletterDraftsLoaded: ({ drafts }) => {
                if (
                    model.editing ||
                    model.saving ||
                    model.uploading ||
                    has_unsaved_changes(model)
                )
                    return [
                        { ...model, drafts: [...drafts], loading: false },
                        [],
                    ]
                const selected =
                    drafts.find(({ id }) => id === model.selectedDraftId) ??
                    drafts[0]

                return [
                    selected === undefined
                        ? { ...model, drafts: [], loading: false, error: null }
                        : {
                              ...model,
                              drafts: [...drafts],
                              selectedDraftId: selected.id,
                              creation_template_id: null,
                              draft: to_draft(selected),
                              base_draft: to_draft(selected),
                              base_updated_at: selected.updated_at,
                              uploading: false,
                              block_document: block_document_for_body(
                                  selected.body_text
                              ),
                              next_block_id: next_block_id_for(
                                  block_document_for_body(selected.body_text)
                              ),
                              editor: editor_for_body(selected.body_text),
                              loading: false,
                              error: null,
                          },
                    [],
                ]
            },
            NewsletterDraftSaved: ({ draft }) => [
                {
                    ...model,
                    drafts: replace_draft(model.drafts, draft),
                    selectedDraftId: draft.id,
                    creation_template_id: null,
                    draft: to_draft(draft),
                    base_draft: to_draft(draft),
                    base_updated_at: draft.updated_at,
                    uploading: false,
                    block_document: block_document_for_body(draft.body_text),
                    next_block_id: next_block_id_for(
                        block_document_for_body(draft.body_text)
                    ),
                    editor: unmountRichTextEditorHost(
                        editor_for_body(draft.body_text)
                    ),
                    editing: false,
                    saving: false,
                    error: null,
                    notice: "Draft saved",
                },
                [],
            ],
            NewsletterDraftDeleted: ({ draftId }) => [
                {
                    ...model,
                    ...select_after_delete(model.drafts, draftId),
                    editing: false,
                    saving: false,
                    error: null,
                    notice: "Draft deleted",
                },
                [],
            ],
            NewsletterRecipientsLoaded: ({ recipients }) => [
                { ...model, recipients: [...recipients] },
                [],
            ],
            UpdatedNewsletterTestRecipient: ({ field, value }) => [
                {
                    ...model,
                    testRecipientName:
                        field === "name" ? value : model.testRecipientName,
                    testRecipientEmail:
                        field === "email" ? value : model.testRecipientEmail,
                    error: null,
                    notice: null,
                },
                [],
            ],
            ClickedSendNewsletterTest: () =>
                can_dispatch(model) &&
                !is_blank(model.testRecipientName) &&
                valid_email(model.testRecipientEmail)
                    ? [
                          {
                              ...model,
                              sending: "test",
                              error: null,
                              notice: null,
                              confirmingSubscriberSend: false,
                          },
                          [
                              SendNewsletterTest({
                                  draftId: model.selectedDraftId,
                                  email: model.testRecipientEmail
                                      .trim()
                                      .toLowerCase(),
                                  name: model.testRecipientName.trim(),
                              }),
                          ],
                      ]
                    : [
                          {
                              ...model,
                              error: "Save a complete draft and enter a valid test recipient",
                          },
                          [],
                      ],
            ClickedSendNewsletterSubscribers: () => {
                if (!can_dispatch(model) || model.recipients.length === 0) {
                    return [
                        {
                            ...model,
                            error: "Save a complete draft with subscribed recipients before sending",
                        },
                        [],
                    ]
                }
                if (!model.confirmingSubscriberSend) {
                    return [
                        {
                            ...model,
                            confirmingSubscriberSend: true,
                            error: null,
                            notice: null,
                        },
                        [],
                    ]
                }

                return [
                    {
                        ...model,
                        sending: "subscribers",
                        confirmingSubscriberSend: false,
                        error: null,
                        notice: null,
                    },
                    [
                        SendNewsletterSubscribers({
                            draftId: model.selectedDraftId,
                        }),
                    ],
                ]
            },
            CancelledNewsletterSubscriberSend: () => [
                { ...model, confirmingSubscriberSend: false },
                [],
            ],
            NewsletterSendsLoaded: ({ sends }) => [
                { ...model, sends: [...sends] },
                [],
            ],
            NewsletterDispatchCompleted: ({ send }) => [
                {
                    ...model,
                    sends: [
                        send,
                        ...model.sends.filter(({ id }) => id !== send.id),
                    ],
                    sending: null,
                    confirmingSubscriberSend: false,
                    error: null,
                    notice:
                        send.status === "completed"
                            ? `Send completed for ${send.accepted_count} recipient${send.accepted_count === 1 ? "" : "s"}`
                            : `Send finished with ${send.failed_count} failure${send.failed_count === 1 ? "" : "s"}`,
                },
                [],
            ],
            NewsletterDispatchFailed: ({ error }) => [
                {
                    ...model,
                    sending: null,
                    confirmingSubscriberSend: false,
                    error,
                    notice: null,
                },
                [],
            ],
            NewsletterDraftActionFailed: ({ action, error }) => [
                {
                    ...model,
                    loading: false,
                    saving:
                        action === "save" || action === "delete"
                            ? false
                            : model.saving,
                    error,
                    notice: null,
                },
                [],
            ],
        })
    )

export const update = (model: Model, message: Message): UpdateReturn => {
    if (
        model.saving &&
        (message._tag === "UpdatedNewsletterDraft" ||
            message._tag === "GotNewsletterRichTextEditorMessage" ||
            message._tag === "AddedNewsletterBlock" ||
            message._tag === "MovedNewsletterBlock" ||
            message._tag === "RemovedNewsletterBlock" ||
            message._tag === "ChangedNewsletterBlockField" ||
            message._tag === "ChangedNewsletterBlockImage" ||
            message._tag === "AddedNewsletterGalleryImage" ||
            message._tag === "MovedNewsletterGalleryImage" ||
            message._tag === "RemovedNewsletterGalleryImage" ||
            message._tag === "SubmittedNewsletterDraft")
    )
        return [model, []]
    if (
        (model.saving || model.uploading || model.sending !== null) &&
        (message._tag === "SelectedNewsletterDraftChanged" ||
            message._tag === "ClickedNewNewsletterDraft" ||
            message._tag === "ClickedDeleteNewsletterDraft")
    )
        return [model, []]
    return update_message(model, message)
}

const editor_subscriptions = Subscription.make<Model, Message>()((entry) => ({
    newsletterRichTextEditor: entry(
        {
            model: RichTextEditorModel,
            editing: S.Boolean,
        },
        {
            modelToDependencies: (model) => ({
                model: model.editor,
                editing: model.editing,
            }),
            dependenciesToStream: ({ model, editing }) =>
                richTextEditorSubscriptions({
                    id: "newsletter-body-editor",
                    model,
                    isDisabled: !editing,
                }).pipe(
                    Stream.map((message) =>
                        GotNewsletterRichTextEditorMessage({ message })
                    )
                ),
        }
    ),
}))

export const subscriptions = editor_subscriptions
