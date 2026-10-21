import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { DragAndDrop, FileDrop } from "@foldkit/ui"
import { LandingMotion } from "@urm/domain/schemas/landing-pages"
import { RichTextEditorMessage } from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.schema.ts"
import { LandingItemSection, LandingSection } from "./model.ts"

export const ClickedEdit = taggedStruct("ClickedEdit")
export const UpdatedCopy = taggedStruct("UpdatedCopy", {
    key: S.String,
    text: S.String,
})
export const ClickedSave = taggedStruct("ClickedSave")
export const ClickedCancel = taggedStruct("ClickedCancel")
export const UpdatedTemplateName = taggedStruct("UpdatedTemplateName", {
    value: S.String,
})
export const UpdatedTemplateDescription = taggedStruct(
    "UpdatedTemplateDescription",
    {
        value: S.String,
    }
)
export const UpdatedTemplateCategory = taggedStruct("UpdatedTemplateCategory", {
    value: S.String,
})
export const UpdatedTemplateTags = taggedStruct("UpdatedTemplateTags", {
    value: S.String,
})
export const ClickedSaveTemplate = taggedStruct("ClickedSaveTemplate")
export const SavedTemplate = taggedStruct("SavedTemplate")
export const FailedTemplateSave = taggedStruct("FailedTemplateSave", {
    error: S.String,
})
export const ChangedMotion = taggedStruct("ChangedMotion", {
    motion: LandingMotion,
})
export const ToggledMotionPreview = taggedStruct("ToggledMotionPreview")
export const ToggledFaq = taggedStruct("ToggledFaq", {
    key: S.String,
    is_open: S.Boolean,
})
export const AddedBlock = taggedStruct("AddedBlock", {
    section: LandingSection,
})
export const RemovedBlock = taggedStruct("RemovedBlock", {
    section: LandingSection,
})
export const AddedBlockItem = taggedStruct("AddedBlockItem", {
    section: LandingItemSection,
})
export const RemovedBlockItem = taggedStruct("RemovedBlockItem", {
    section: LandingItemSection,
    index: S.Number,
})
export const UpdatedBlockItem = taggedStruct("UpdatedBlockItem", {
    section: LandingItemSection,
    index: S.Number,
    field: S.Literals(["first", "second"]),
    text: S.String,
})
export const SelectedHeroImage = taggedStruct("SelectedHeroImage", {
    image_id: S.String,
    alt: S.String,
})
export const ClearedHeroImage = taggedStruct("ClearedHeroImage")
export const ToggledHeroImageLibrary = taggedStruct("ToggledHeroImageLibrary")
export const GotHeroImageDropMessage = taggedStruct("GotHeroImageDropMessage", {
    message: FileDrop.Message,
})
export const UploadedHeroImage = taggedStruct("UploadedHeroImage", {
    image_id: S.String,
    alt: S.String,
})
export const HeroImageUploadFailed = taggedStruct("HeroImageUploadFailed", {
    error: S.String,
})
export const SelectedLogoImage = taggedStruct("SelectedLogoImage", {
    index: S.Number,
    image_id: S.String,
    alt: S.String,
})
export const ClearedLogoImage = taggedStruct("ClearedLogoImage", {
    index: S.Number,
})
export const ToggledLogoImageLibrary = taggedStruct("ToggledLogoImageLibrary", {
    index: S.Number,
})
export const GotLogoImageDropMessage = taggedStruct("GotLogoImageDropMessage", {
    itemId: S.String,
    message: FileDrop.Message,
})
export const UploadedLogoImage = taggedStruct("UploadedLogoImage", {
    index: S.Number,
    image_id: S.String,
    alt: S.String,
})
export const LogoImageUploadFailed = taggedStruct("LogoImageUploadFailed", {
    error: S.String,
})
export const GotLandingDragAndDropMessage = taggedStruct(
    "GotLandingDragAndDropMessage",
    {
        message: DragAndDrop.Message,
    }
)
export const GotLandingRichTextEditorMessage = taggedStruct(
    "GotLandingRichTextEditorMessage",
    { message: RichTextEditorMessage }
)

export const Message = S.Union([
    ClickedEdit,
    UpdatedCopy,
    ClickedSave,
    ClickedCancel,
    UpdatedTemplateName,
    UpdatedTemplateDescription,
    UpdatedTemplateCategory,
    UpdatedTemplateTags,
    ClickedSaveTemplate,
    SavedTemplate,
    FailedTemplateSave,
    ChangedMotion,
    ToggledMotionPreview,
    ToggledFaq,
    AddedBlock,
    RemovedBlock,
    AddedBlockItem,
    RemovedBlockItem,
    UpdatedBlockItem,
    SelectedHeroImage,
    ClearedHeroImage,
    ToggledHeroImageLibrary,
    GotHeroImageDropMessage,
    UploadedHeroImage,
    HeroImageUploadFailed,
    SelectedLogoImage,
    ClearedLogoImage,
    ToggledLogoImageLibrary,
    GotLogoImageDropMessage,
    UploadedLogoImage,
    LogoImageUploadFailed,
    GotLandingDragAndDropMessage,
    GotLandingRichTextEditorMessage,
])
export type Message = typeof Message.Type
