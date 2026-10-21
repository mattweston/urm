import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { DragAndDrop, FileDrop } from "@foldkit/ui"
import { RichTextEditorModel } from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.schema.ts"
import {
    LandingImage,
    LandingMotion,
    LandingPageDocument,
} from "@urm/domain/schemas/landing-pages"

export const Viewing = taggedStruct("Viewing")
export const Editing = taggedStruct("Editing")
export const EditorState = S.Union([Viewing, Editing])

export const CopyMap = S.Record(S.String, S.String)

export const LandingItemSection = S.Literals([
    "hero",
    "features",
    "integrations",
    "faq",
    "cta",
])
export type LandingItemSection = typeof LandingItemSection.Type

export const LandingEditableItem = S.Struct({
    id: S.String,
    first: S.String,
    second: S.String,
    third: S.String,
})
export type LandingEditableItem = typeof LandingEditableItem.Type

export const LandingBlockItems = S.Record(
    S.String,
    S.Array(LandingEditableItem)
)

export const LandingSection = S.Literals([
    "hero",
    "intro",
    "rich_text",
    "features",
    "modules",
    "showcase",
    "integrations",
    "stack",
    "pricing",
    "faq",
    "cta",
])
export type LandingSection = typeof LandingSection.Type

export const LandingEditorPreset = S.Literals(["blank", "urm"])
export type LandingEditorPreset = typeof LandingEditorPreset.Type

export const Model = S.Struct({
    preset: LandingEditorPreset,
    publication_view: S.optional(S.Boolean),
    page_id: S.Option(S.String),
    loaded_content: S.String,
    source_document: S.Option(LandingPageDocument),
    drafts: CopyMap,
    saved_snapshot: CopyMap,
    block_items: LandingBlockItems,
    saved_block_items: LandingBlockItems,
    hero_image: S.Option(LandingImage),
    saved_hero_image: S.Option(LandingImage),
    rich_text_editor: RichTextEditorModel,
    saved_rich_text_document: RichTextEditorModel.fields.document,
    motion: LandingMotion,
    saved_motion: LandingMotion,
    preview_motion: S.Boolean,
    hero_image_drop: FileDrop.Model,
    hero_image_library_open: S.Boolean,
    hero_image_upload_busy: S.Boolean,
    hero_image_upload_error: S.Option(S.String),
    logo_image_drop: FileDrop.Model,
    logo_image_library_index: S.Option(S.Number),
    logo_image_upload_index: S.Option(S.Number),
    logo_image_upload_error: S.Option(S.String),
    blocks: S.Array(LandingSection),
    saved_blocks: S.Array(LandingSection),
    drag_and_drop: DragAndDrop.Model,
    editor_state: EditorState,
    template_name: S.String,
    template_description: S.String,
    template_category: S.String,
    template_tags: S.String,
    template_save_status: S.Literals(["idle", "saving", "saved", "error"]),
    template_save_error: S.Option(S.String),
    open_faqs: S.Record(S.String, S.Boolean),
})

export type Model = typeof Model.Type
