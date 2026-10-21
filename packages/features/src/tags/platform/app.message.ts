import { Schema as S } from "effect"
import * as Ui from "@foldkit/ui"
import { taggedStruct } from "foldkit/schema"

import { EntityTag, Tag } from "@urm/domain/schemas/tags"

import { TagSortBy } from "./app.model.ts"

export const LoadedTags = taggedStruct("LoadedTags", {
    tags: S.Array(Tag),
    entityTags: S.Array(EntityTag),
})

export const FailedLoadingTags = taggedStruct("FailedLoadingTags", {
    error: S.String,
})

export const SearchQueryChanged = taggedStruct("SearchQueryChanged", {
    value: S.String,
})

export const SortByChanged = taggedStruct("SortByChanged", {
    value: TagSortBy,
})

export const CreateTagNameChanged = taggedStruct("CreateTagNameChanged", {
    value: S.String,
})

export const CreateTagColorChanged = taggedStruct("CreateTagColorChanged", {
    value: S.String,
})

export const CreateTagDescriptionChanged = taggedStruct(
    "CreateTagDescriptionChanged",
    {
        value: S.String,
    }
)

export const ClickedCreateTag = taggedStruct("ClickedCreateTag")
export const CreatedTag = taggedStruct("CreatedTag")
export const CreateTagFailed = taggedStruct("CreateTagFailed", {
    error: S.String,
})
export const SyncedDirectoryTags = taggedStruct("SyncedDirectoryTags")
export const DirectoryTagSyncFailed = taggedStruct("DirectoryTagSyncFailed", {
    error: S.String,
})

export const OpenedTagEditor = taggedStruct("OpenedTagEditor", {
    tagId: S.String,
})

export const ClosedTagEditor = taggedStruct("ClosedTagEditor")

export const EditingTagNameChanged = taggedStruct("EditingTagNameChanged", {
    value: S.String,
})

export const EditingTagColorChanged = taggedStruct("EditingTagColorChanged", {
    value: S.String,
})

export const EditingTagDescriptionChanged = taggedStruct(
    "EditingTagDescriptionChanged",
    {
        value: S.String,
    }
)

export const ClickedSaveTagEdits = taggedStruct("ClickedSaveTagEdits")
export const SavedTagEdits = taggedStruct("SavedTagEdits")
export const TagEditsSaveFailed = taggedStruct("TagEditsSaveFailed", {
    error: S.String,
})

export const ClickedDeleteTag = taggedStruct("ClickedDeleteTag", {
    tagId: S.String,
})

export const GotDeleteConfirmationDialogMessage = taggedStruct(
    "GotDeleteConfirmationDialogMessage",
    {
        message: Ui.Dialog.Message,
    }
)

export const ConfirmedDeleteTag = taggedStruct("ConfirmedDeleteTag")

export const DeletedTag = taggedStruct("DeletedTag", {
    tagId: S.String,
})

export const DeleteTagFailed = taggedStruct("DeleteTagFailed", {
    error: S.String,
})

export const Message = S.Union([
    LoadedTags,
    FailedLoadingTags,
    SearchQueryChanged,
    SortByChanged,
    CreateTagNameChanged,
    CreateTagColorChanged,
    CreateTagDescriptionChanged,
    ClickedCreateTag,
    CreatedTag,
    CreateTagFailed,
    SyncedDirectoryTags,
    DirectoryTagSyncFailed,
    OpenedTagEditor,
    ClosedTagEditor,
    EditingTagNameChanged,
    EditingTagColorChanged,
    EditingTagDescriptionChanged,
    ClickedSaveTagEdits,
    SavedTagEdits,
    TagEditsSaveFailed,
    ClickedDeleteTag,
    GotDeleteConfirmationDialogMessage,
    ConfirmedDeleteTag,
    DeletedTag,
    DeleteTagFailed,
])

export type Message = typeof Message.Type
