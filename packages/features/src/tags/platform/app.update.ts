import { Effect, Match as M, Schema as S, String } from "effect"
import { Command } from "foldkit"
import * as Ui from "@foldkit/ui"
import { modifyFields } from "foldkit/struct"

import type { Message } from "./app.message.ts"
import { DEFAULT_TAG_COLOR, TAG_COLOR_OPTIONS } from "./app.model.ts"
import {
    CreateTagFailed,
    DirectoryTagSyncFailed,
    CreatedTag,
    DeleteTagFailed,
    DeletedTag,
    FailedLoadingTags,
    GotDeleteConfirmationDialogMessage,
    LoadedTags,
    SavedTagEdits,
    TagEditsSaveFailed,
    SyncedDirectoryTags,
} from "./app.message.ts"
import { Model } from "./app.model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()
const CreateTag = Command.define("CreateTag", {
    args: { model: Model },
    messages: [CreatedTag, CreateTagFailed],
    execute: () =>
        Effect.succeed(
            CreateTagFailed({ error: "No tags persistence adapter installed" })
        ),
})
const SaveTagEdits = Command.define("SaveTagEdits", {
    args: { model: Model },
    messages: [SavedTagEdits, TagEditsSaveFailed],
    execute: () =>
        Effect.succeed(
            TagEditsSaveFailed({
                error: "No tags persistence adapter installed",
            })
        ),
})
const DeleteTag = Command.define("DeleteTag", {
    args: { tagId: S.String },
    messages: [DeletedTag, DeleteTagFailed],
    execute: () =>
        Effect.succeed(
            DeleteTagFailed({ error: "No tags persistence adapter installed" })
        ),
})

const trimText = (value: string): string => String.trim(value)

const isTagColorOption = (value: string): boolean =>
    TAG_COLOR_OPTIONS.some((option) => option.value === value)

const normalizeTagColor = (value: string): string =>
    isTagColorOption(value) ? value : DEFAULT_TAG_COLOR

const LoadTags = Command.define("LoadTags", {
    messages: [LoadedTags, FailedLoadingTags],
    execute: Effect.succeed(
        FailedLoadingTags({ error: "No tags persistence adapter installed" })
    ),
})
const SyncDirectoryTags = Command.define("SyncDirectoryTags", {
    messages: [SyncedDirectoryTags, DirectoryTagSyncFailed],
    execute: Effect.succeed(
        DirectoryTagSyncFailed({
            error: "No directory tag persistence adapter installed",
        })
    ),
})

const loadTags = () => LoadTags()

export const init = (): UpdateReturn => [
    {
        loading: true,
        error: null,
        tags: [],
        entityTags: [],
        searchQuery: "",
        sortBy: "name",
        mutating: false,
        directoryTagsSynced: false,
        creatingName: "",
        creatingColor: "",
        creatingDescription: "",
        editingTagId: null,
        editingName: "",
        editingColor: DEFAULT_TAG_COLOR,
        editingDescription: "",
        pendingDeleteTagId: null,
        deleteConfirmationDialog: Ui.Dialog.init({ id: "delete-tag" }),
    },
    [loadTags()],
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            LoadedTags: ({ tags, entityTags }) => [
                modifyFields(model, {
                    loading: () => false,
                    error: () => null,
                    tags: () => tags,
                    entityTags: () => entityTags,
                    mutating: () => false,
                    directoryTagsSynced: () => true,
                }),
                model.directoryTagsSynced ? [] : [SyncDirectoryTags()],
            ],
            SyncedDirectoryTags: () => [model, []],
            DirectoryTagSyncFailed: ({ error }) => [
                modifyFields(model, { error: () => error }),
                [],
            ],

            FailedLoadingTags: ({ error }) => [
                modifyFields(model, {
                    loading: () => false,
                    error: () => error,
                    mutating: () => false,
                }),
                [],
            ],

            SearchQueryChanged: ({ value }) => [
                modifyFields(model, { searchQuery: () => value }),
                [],
            ],

            SortByChanged: ({ value }) => [
                modifyFields(model, { sortBy: () => value }),
                [],
            ],

            CreateTagNameChanged: ({ value }) => [
                modifyFields(model, { creatingName: () => value }),
                [],
            ],

            CreateTagColorChanged: ({ value }) => [
                modifyFields(model, { creatingColor: () => value }),
                [],
            ],

            CreateTagDescriptionChanged: ({ value }) => [
                modifyFields(model, { creatingDescription: () => value }),
                [],
            ],

            ClickedCreateTag: () => {
                if (
                    model.loading ||
                    model.mutating ||
                    String.isEmpty(trimText(model.creatingName))
                ) {
                    return [model, []]
                }

                return [
                    modifyFields(model, {
                        error: () => null,
                        mutating: () => true,
                    }),
                    [CreateTag({ model })],
                ]
            },

            CreatedTag: () => [
                modifyFields(model, {
                    error: () => null,
                    mutating: () => false,
                    creatingName: () => "",
                    creatingColor: () => "",
                    creatingDescription: () => "",
                }),
                [loadTags()],
            ],

            CreateTagFailed: ({ error }) => [
                modifyFields(model, {
                    mutating: () => false,
                    error: () => error,
                }),
                [],
            ],

            OpenedTagEditor: ({ tagId }) => {
                const tag = model.tags.find((item) => item.id === tagId)

                if (
                    tag === undefined ||
                    tag.kind === "role" ||
                    tag.kind === "person"
                ) {
                    return [model, []]
                }

                return [
                    modifyFields(model, {
                        editingTagId: () => tag.id,
                        editingName: () => tag.name,
                        editingColor: () => normalizeTagColor(tag.color),
                        editingDescription: () => tag.description ?? "",
                    }),
                    [],
                ]
            },

            ClosedTagEditor: () => [
                modifyFields(model, {
                    editingTagId: () => null,
                    editingName: () => "",
                    editingColor: () => DEFAULT_TAG_COLOR,
                    editingDescription: () => "",
                }),
                [],
            ],

            EditingTagNameChanged: ({ value }) => [
                modifyFields(model, { editingName: () => value }),
                [],
            ],

            EditingTagColorChanged: ({ value }) => [
                modifyFields(model, { editingColor: () => value }),
                [],
            ],

            EditingTagDescriptionChanged: ({ value }) => [
                modifyFields(model, { editingDescription: () => value }),
                [],
            ],

            ClickedSaveTagEdits: () => {
                if (
                    model.loading ||
                    model.mutating ||
                    model.editingTagId === null ||
                    String.isEmpty(trimText(model.editingName))
                ) {
                    return [model, []]
                }

                return [
                    modifyFields(model, {
                        error: () => null,
                        mutating: () => true,
                    }),
                    [SaveTagEdits({ model })],
                ]
            },

            SavedTagEdits: () => [
                modifyFields(model, {
                    error: () => null,
                    mutating: () => false,
                    editingTagId: () => null,
                    editingName: () => "",
                    editingColor: () => DEFAULT_TAG_COLOR,
                    editingDescription: () => "",
                }),
                [loadTags()],
            ],

            TagEditsSaveFailed: ({ error }) => [
                modifyFields(model, {
                    mutating: () => false,
                    error: () => error,
                }),
                [],
            ],

            ClickedDeleteTag: ({ tagId }) => {
                if (model.loading || model.mutating) {
                    return [model, []]
                }

                const tag = model.tags.find((item) => item.id === tagId)
                if (
                    tag === undefined ||
                    tag.kind === "role" ||
                    tag.kind === "person"
                ) {
                    return [model, []]
                }

                const { model: deleteConfirmationDialog, commands = [] } =
                    Ui.Dialog.update(
                        model.deleteConfirmationDialog,
                        Ui.Dialog.Message.RequestedOpen()
                    )

                return [
                    modifyFields(model, {
                        pendingDeleteTagId: () => tagId,
                        deleteConfirmationDialog: () =>
                            deleteConfirmationDialog,
                    }),
                    commands.map(
                        Command.mapEffect(
                            Effect.map((message) =>
                                GotDeleteConfirmationDialogMessage({ message })
                            )
                        )
                    ),
                ]
            },

            GotDeleteConfirmationDialogMessage: ({ message }) => {
                const { model: deleteConfirmationDialog, commands = [] } =
                    Ui.Dialog.update(model.deleteConfirmationDialog, message)

                return [
                    modifyFields(model, {
                        deleteConfirmationDialog: () =>
                            deleteConfirmationDialog,
                    }),
                    commands.map(
                        Command.mapEffect(
                            Effect.map((nextMessage) =>
                                GotDeleteConfirmationDialogMessage({
                                    message: nextMessage,
                                })
                            )
                        )
                    ),
                ]
            },

            ConfirmedDeleteTag: () => {
                if (
                    model.loading ||
                    model.mutating ||
                    model.pendingDeleteTagId === null
                ) {
                    return [model, []]
                }

                const tagId = model.pendingDeleteTagId
                const {
                    model: deleteConfirmationDialog,
                    commands: dialogCommands = [],
                } = Ui.Dialog.update(
                    model.deleteConfirmationDialog,
                    Ui.Dialog.Message.RequestedClose()
                )
                return [
                    modifyFields(model, {
                        error: () => null,
                        mutating: () => true,
                        pendingDeleteTagId: () => null,
                        deleteConfirmationDialog: () =>
                            deleteConfirmationDialog,
                    }),
                    [
                        ...dialogCommands.map(
                            Command.mapEffect(
                                Effect.map((message) =>
                                    GotDeleteConfirmationDialogMessage({
                                        message,
                                    })
                                )
                            )
                        ),
                        DeleteTag({ tagId }),
                    ],
                ]
            },

            DeletedTag: ({ tagId }) => [
                modifyFields(model, {
                    error: () => null,
                    mutating: () => false,
                    editingTagId: (current) =>
                        current === tagId ? null : current,
                    editingName: (current) =>
                        model.editingTagId === tagId ? "" : current,
                    editingColor: (current) =>
                        model.editingTagId === tagId
                            ? DEFAULT_TAG_COLOR
                            : current,
                    editingDescription: (current) =>
                        model.editingTagId === tagId ? "" : current,
                }),
                [loadTags()],
            ],

            DeleteTagFailed: ({ error }) => [
                modifyFields(model, {
                    mutating: () => false,
                    error: () => error,
                }),
                [],
            ],
        })
    )
