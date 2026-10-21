import { Match as M, Result, Schema as S } from "effect"
import type { Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { defineTaggedUnion } from "foldkit/schema"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// A real Foldkit Model example
// -----------------------------------------------------------------------------

export const NoteStatus = S.Literals(["Draft", "Published"])
export type NoteStatus = typeof NoteStatus.Type

export const NoteFilter = S.Literals(["All", "Draft", "Published"])
export type NoteFilter = typeof NoteFilter.Type

export const Note = S.Struct({
    id: S.String,
    title: S.String,
    status: NoteStatus,
})
export type Note = typeof Note.Type

// When one Model field has several named shapes, Foldkit recommends declaring
// them together with defineTaggedUnion.
export const EditorMode = defineTaggedUnion({
    Browsing: {},
    Editing: {
        noteId: S.String,
    },
    Previewing: {
        noteId: S.String,
    },
})
export type EditorMode = typeof EditorMode.Type

// This is the application state tree for the miniature notes editor.
export const EditorModel = S.Struct({
    notes: S.Array(Note),
    filter: NoteFilter,
    isSidebarOpen: S.Boolean,
    editorMode: EditorMode,
})
export type EditorModel = typeof EditorModel.Type

export const editorInit = (): EditorModel => ({
    notes: [
        {
            id: "n-1",
            title: "Effect notes",
            status: "Draft",
        },
        {
            id: "n-2",
            title: "Foldkit model",
            status: "Published",
        },
        {
            id: "n-3",
            title: "Schema ideas",
            status: "Draft",
        },
    ],
    filter: "All",
    isSidebarOpen: true,
    editorMode: EditorMode.Browsing(),
})

// Exhaustive matching lives on the union itself.
export const modeLabel = (mode: EditorMode): string =>
    EditorMode.match(mode, {
        Browsing: () => "Browsing notes",
        Editing: ({ noteId }) => `Editing ${noteId}`,
        Previewing: ({ noteId }) => `Previewing ${noteId}`,
    })

// One-variant guard.
export const isEditing = (mode: EditorMode): boolean =>
    EditorMode.guards.Editing(mode)

// Several-variant guard.
export const isWorking = EditorMode.isAnyOf(["Editing", "Previewing"])

// A smaller runtime Schema that accepts only these named variants.
export const WorkingMode = EditorMode.subset(["Editing", "Previewing"])

// Derived values are functions of stored state, not additional Model fields.
export const visibleNotes = (model: EditorModel): ReadonlyArray<Note> =>
    model.filter === "All"
        ? model.notes
        : model.notes.filter((note) => note.status === model.filter)

export const visibleCount = (model: EditorModel): number =>
    visibleNotes(model).length

// -----------------------------------------------------------------------------
// Teaching demo model
// -----------------------------------------------------------------------------

export const Stage = S.Literals(["Tree", "Schema", "Variants", "Derived"])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Tree",
    "Schema",
    "Variants",
    "Derived",
]

export const SchemaCase = S.Literals(["Valid", "MissingNotes", "BadMode"])
export type SchemaCase = typeof SchemaCase.Type

// The demo itself also has one Model tree. The nested `editor` field is the
// application Model being inspected in the visual lesson.
export const Model = S.Struct({
    stage: Stage,
    editor: EditorModel,
    schemaCase: SchemaCase,
})
export type Model = typeof Model.Type

export const SelectedModelStage = taggedStruct("SelectedModelStage", {
    stage: Stage,
})

export const ClickedAddModelNote = taggedStruct("ClickedAddModelNote")

export const ClickedToggleModelSidebar = taggedStruct(
    "ClickedToggleModelSidebar"
)

export const SelectedModelFilter = taggedStruct("SelectedModelFilter", {
    filter: NoteFilter,
})

export const ClickedBrowseModel = taggedStruct("ClickedBrowseModel")

export const ClickedEditModel = taggedStruct("ClickedEditModel")

export const ClickedPreviewModel = taggedStruct("ClickedPreviewModel")

export const SelectedModelSchemaCase = taggedStruct("SelectedModelSchemaCase", {
    schemaCase: SchemaCase,
})

export const ClickedResetModelDemo = taggedStruct("ClickedResetModelDemo")

export const Message = S.Union([
    SelectedModelStage,
    ClickedAddModelNote,
    ClickedToggleModelSidebar,
    SelectedModelFilter,
    ClickedBrowseModel,
    ClickedEditModel,
    ClickedPreviewModel,
    SelectedModelSchemaCase,
    ClickedResetModelDemo,
])
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Tree",
    editor: editorInit(),
    schemaCase: "Valid",
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            SelectedModelStage: ({ stage }) => ({
                model: evo(model, {
                    stage: () => stage,
                }),
                commands: [],
            }),

            ClickedAddModelNote: () => {
                const number = model.editor.notes.length + 1

                const next: Note = {
                    id: `n-${number}`,
                    title: `New note ${number}`,
                    status: number % 2 === 0 ? "Published" : "Draft",
                }

                return {
                    model: evo(model, {
                        editor: (editor) => ({
                            ...editor,
                            notes: [...editor.notes, next],
                        }),
                    }),
                    commands: [],
                }
            },

            ClickedToggleModelSidebar: () => ({
                model: evo(model, {
                    editor: (editor) => ({
                        ...editor,
                        isSidebarOpen: !editor.isSidebarOpen,
                    }),
                }),
                commands: [],
            }),

            SelectedModelFilter: ({ filter }) => ({
                model: evo(model, {
                    editor: (editor) => ({
                        ...editor,
                        filter,
                    }),
                }),
                commands: [],
            }),

            ClickedBrowseModel: () => ({
                model: evo(model, {
                    editor: (editor) => ({
                        ...editor,
                        editorMode: EditorMode.Browsing(),
                    }),
                }),
                commands: [],
            }),

            ClickedEditModel: () => ({
                model: evo(model, {
                    editor: (editor) => ({
                        ...editor,
                        editorMode: EditorMode.Editing({
                            noteId: "n-1",
                        }),
                    }),
                }),
                commands: [],
            }),

            ClickedPreviewModel: () => ({
                model: evo(model, {
                    editor: (editor) => ({
                        ...editor,
                        editorMode: EditorMode.Previewing({
                            noteId: "n-2",
                        }),
                    }),
                }),
                commands: [],
            }),

            SelectedModelSchemaCase: ({ schemaCase }) => ({
                model: evo(model, {
                    schemaCase: () => schemaCase,
                }),
                commands: [],
            }),

            ClickedResetModelDemo: () => ({
                model: evo(model, {
                    editor: () => editorInit(),
                    schemaCase: () => "Valid",
                }),
                commands: [],
            }),
        })
    )

// -----------------------------------------------------------------------------
// Runtime Schema demonstration
// -----------------------------------------------------------------------------

export const schemaInput = (model: Model): unknown => {
    switch (model.schemaCase) {
        case "Valid":
            return model.editor

        case "MissingNotes":
            return {
                filter: model.editor.filter,
                isSidebarOpen: model.editor.isSidebarOpen,
                editorMode: model.editor.editorMode,
            }

        case "BadMode":
            return {
                ...model.editor,
                editorMode: {
                    _tag: "SomethingElse",
                },
            }
    }
}

export const schemaResult = (model: Model) =>
    S.decodeUnknownResult(EditorModel)(schemaInput(model))

export const schemaResultLabel = (model: Model): string =>
    Result.match(schemaResult(model), {
        onSuccess: () => "Success<EditorModel>",
        onFailure: (error) => `Failure\n${String(error)}`,
    })

export const storedFacts = (model: EditorModel): ReadonlyArray<string> => [
    `notes = ${model.notes.length} items`,
    `filter = ${model.filter}`,
    `isSidebarOpen = ${model.isSidebarOpen}`,
    `editorMode = ${model.editorMode._tag}`,
]

export const derivedFacts = (model: EditorModel): ReadonlyArray<string> => [
    `visibleCount = ${visibleCount(model)}`,
    `visibleNotes = ${visibleNotes(model)
        .map((note) => note.title)
        .join(", ")}`,
    `modeLabel = ${modeLabel(model.editorMode)}`,
    `isWorking = ${isWorking(model.editorMode)}`,
]
