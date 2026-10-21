import { Effect, Schema } from "effect"
import { Command } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import {
    default_transactional_copy,
    TransactionalTemplateId,
    TransactionalTemplateState,
    TransactionalHistoryEntry,
    TransactionalHistoryPage,
} from "@urm/email/transactional-content"

const CopyDraft = Schema.Struct({
    subject: Schema.String,
    heading: Schema.String,
    introduction: Schema.String,
})
const History = Schema.Struct({
    loaded: Schema.Boolean,
    loading: Schema.Boolean,
    request_id: Schema.Number,
    versions: Schema.Array(TransactionalHistoryEntry),
    next_before_version: Schema.NullOr(Schema.Number),
    error: Schema.String,
})
const empty_history = (request_id = 0): typeof History.Type => ({
    loaded: false,
    loading: false,
    request_id,
    versions: [],
    next_before_version: null,
    error: "",
})
const Editor = Schema.Struct({
    template_id: TransactionalTemplateId,
    copy: CopyDraft,
    base_version: Schema.Number,
    dirty: Schema.Boolean,
    editing: Schema.Boolean,
    busy: Schema.Boolean,
    error: Schema.String,
    history: History,
})
export const Model = Schema.Struct({
    domain_id: Schema.String,
    loaded: Schema.Boolean,
    states: Schema.Array(TransactionalTemplateState),
    editors: Schema.Array(Editor),
})
export type Model = typeof Model.Type
export const LoadedTransactionalTemplates = taggedStruct(
    "LoadedTransactionalTemplates",
    {
        states: Schema.Array(TransactionalTemplateState),
    }
)
export const ChangedTransactionalCopy = taggedStruct(
    "ChangedTransactionalCopy",
    {
        template_id: TransactionalTemplateId,
        field: Schema.Literals(["subject", "heading", "introduction"]),
        value: Schema.String,
    }
)
export const ToggledTransactionalEditing = taggedStruct(
    "ToggledTransactionalEditing",
    {
        template_id: TransactionalTemplateId,
    }
)
export const ReloadTransactionalCopy = taggedStruct("ReloadTransactionalCopy", {
    template_id: TransactionalTemplateId,
})
export const SaveTransactionalCopy = taggedStruct("SaveTransactionalCopy", {
    template_id: TransactionalTemplateId,
})
export const ActivateTransactionalCopy = taggedStruct(
    "ActivateTransactionalCopy",
    {
        template_id: TransactionalTemplateId,
    }
)
export const RestoreTransactionalCopy = taggedStruct(
    "RestoreTransactionalCopy",
    {
        template_id: TransactionalTemplateId,
        source_version: Schema.Number,
    }
)
export const RequestedTransactionalHistory = taggedStruct(
    "RequestedTransactionalHistory",
    {
        template_id: TransactionalTemplateId,
        older: Schema.Boolean,
    }
)
export const HistoryArgs = Schema.Struct({
    domain_id: Schema.String,
    template_id: TransactionalTemplateId,
    before_version: Schema.NullOr(Schema.Number),
    request_id: Schema.Number,
})
export const LoadedTransactionalHistory = taggedStruct(
    "LoadedTransactionalHistory",
    {
        ...HistoryArgs.fields,
        page: TransactionalHistoryPage,
    }
)
export const FailedTransactionalHistory = taggedStruct(
    "FailedTransactionalHistory",
    {
        ...HistoryArgs.fields,
        error: Schema.String,
    }
)
const LoadTransactionalHistory = Command.define("LoadTransactionalHistory", {
    args: HistoryArgs.fields,
    messages: [LoadedTransactionalHistory, FailedTransactionalHistory],
    execute: (args) =>
        Effect.succeed(
            FailedTransactionalHistory({
                ...args,
                error: "A host persistence adapter is required.",
            })
        ),
})
export const CompletedTransactionalCopy = taggedStruct(
    "CompletedTransactionalCopy",
    {
        domain_id: Schema.String,
        state: TransactionalTemplateState,
    }
)
export const FailedTransactionalCopy = taggedStruct("FailedTransactionalCopy", {
    domain_id: Schema.String,
    template_id: TransactionalTemplateId,
    error: Schema.String,
})
export const Message = Schema.Union([
    LoadedTransactionalTemplates,
    ChangedTransactionalCopy,
    ToggledTransactionalEditing,
    ReloadTransactionalCopy,
    SaveTransactionalCopy,
    ActivateTransactionalCopy,
    RestoreTransactionalCopy,
    RequestedTransactionalHistory,
    LoadedTransactionalHistory,
    FailedTransactionalHistory,
    CompletedTransactionalCopy,
    FailedTransactionalCopy,
])
export type Message = typeof Message.Type
export const PersistArgs = Schema.Struct({
    domain_id: Schema.String,
    template_id: TransactionalTemplateId,
    operation: Schema.Literals(["save", "activate", "restore"]),
    source_version: Schema.Number,
    expected_version: Schema.Number,
    expected_active_version: Schema.Number,
    copy: CopyDraft,
})
const PersistTransactionalCopy = Command.define("PersistTransactionalCopy", {
    args: PersistArgs.fields,
    messages: [CompletedTransactionalCopy, FailedTransactionalCopy],
    execute: (args) =>
        Effect.succeed(
            FailedTransactionalCopy({
                ...args,
                error: "A host persistence adapter is required.",
            })
        ),
})
export const init = (domain_id: string): Model => ({
    domain_id,
    loaded: false,
    states: [],
    editors: TransactionalTemplateId.literals.map((template_id) => ({
        template_id,
        copy: default_transactional_copy(template_id),
        base_version: 0,
        dirty: false,
        editing: true,
        busy: false,
        error: "",
        history: empty_history(),
    })),
})
const refresh = (
    editor: typeof Editor.Type,
    states: ReadonlyArray<TransactionalTemplateState>
): typeof Editor.Type => {
    const state = states.find(
        (state) => state.template_id === editor.template_id
    )
    return {
        ...editor,
        copy:
            state?.latest?.copy ??
            default_transactional_copy(editor.template_id),
        base_version: state?.latest?.version ?? 0,
        dirty: false,
        busy: false,
        error: "",
        history:
            editor.base_version === (state?.latest?.version ?? 0)
                ? editor.history
                : empty_history(editor.history.request_id + 1),
    }
}
export const update = (
    model: Model,
    message: Message
): readonly [Model, ReadonlyArray<Command.Command<Message>>] => {
    if (
        message._tag === "LoadedTransactionalHistory" ||
        message._tag === "FailedTransactionalHistory"
    ) {
        if (message.domain_id !== model.domain_id) return [model, []]
        return [
            {
                ...model,
                editors: model.editors.map((editor) => {
                    if (
                        editor.template_id !== message.template_id ||
                        !editor.history.loading ||
                        editor.history.request_id !== message.request_id
                    )
                        return editor
                    return {
                        ...editor,
                        history:
                            message._tag === "FailedTransactionalHistory"
                                ? {
                                      ...editor.history,
                                      loading: false,
                                      error: message.error,
                                  }
                                : {
                                      ...editor.history,
                                      loaded: true,
                                      loading: false,
                                      error: "",
                                      versions:
                                          message.before_version === null
                                              ? message.page.versions
                                              : [
                                                    ...editor.history.versions,
                                                    ...message.page.versions,
                                                ],
                                      next_before_version:
                                          message.page.next_before_version,
                                  },
                    }
                }),
            },
            [],
        ]
    }
    if (message._tag === "LoadedTransactionalTemplates")
        return [
            {
                ...model,
                loaded: true,
                states: message.states,
                editors: model.editors.map((editor) =>
                    editor.dirty || editor.busy
                        ? editor
                        : refresh(editor, message.states)
                ),
            },
            [],
        ]
    if (message._tag === "CompletedTransactionalCopy") {
        if (message.domain_id !== model.domain_id) return [model, []]
        const states = [
            ...model.states.filter(
                (state) => state.template_id !== message.state.template_id
            ),
            message.state,
        ]
        return [
            {
                ...model,
                states,
                editors: model.editors.map((editor) =>
                    editor.template_id === message.state.template_id
                        ? refresh(editor, states)
                        : editor
                ),
            },
            [],
        ]
    }
    if (message._tag === "FailedTransactionalCopy")
        return message.domain_id !== model.domain_id
            ? [model, []]
            : [
                  {
                      ...model,
                      editors: model.editors.map((editor) =>
                          editor.template_id === message.template_id
                              ? { ...editor, busy: false, error: message.error }
                              : editor
                      ),
                  },
                  [],
              ]
    const editor = model.editors.find(
        (editor) => editor.template_id === message.template_id
    )
    if (editor === undefined || editor.busy || !model.loaded) return [model, []]
    const replace = (next: typeof Editor.Type): Model => ({
        ...model,
        editors: model.editors.map((item) =>
            item.template_id === next.template_id ? next : item
        ),
    })
    if (message._tag === "RequestedTransactionalHistory") {
        if (
            editor.history.loading ||
            (message.older && editor.history.next_before_version === null)
        )
            return [model, []]
        const request_id = editor.history.request_id + 1
        return [
            replace({
                ...editor,
                history: {
                    ...editor.history,
                    loading: true,
                    error: "",
                    request_id,
                },
            }),
            [
                LoadTransactionalHistory({
                    domain_id: model.domain_id,
                    template_id: editor.template_id,
                    before_version: message.older
                        ? editor.history.next_before_version
                        : null,
                    request_id,
                }),
            ],
        ]
    }
    if (message._tag === "ToggledTransactionalEditing")
        return [replace({ ...editor, editing: !editor.editing }), []]
    if (message._tag === "ChangedTransactionalCopy")
        return [
            replace({
                ...editor,
                copy: { ...editor.copy, [message.field]: message.value },
                dirty: true,
                error: "",
            }),
            [],
        ]
    if (message._tag === "ReloadTransactionalCopy")
        return [replace(refresh(editor, model.states)), []]
    if (
        message._tag === "ActivateTransactionalCopy" &&
        (editor.dirty || editor.base_version === 0)
    )
        return [model, []]
    if (
        message._tag === "RestoreTransactionalCopy" &&
        (editor.dirty ||
            (message.source_version !== 0 &&
                !editor.history.versions.some(
                    (version) => version.version === message.source_version
                )))
    )
        return [model, []]
    return [
        replace({ ...editor, busy: true, error: "" }),
        [
            PersistTransactionalCopy({
                domain_id: model.domain_id,
                template_id: editor.template_id,
                operation:
                    message._tag === "SaveTransactionalCopy"
                        ? "save"
                        : message._tag === "RestoreTransactionalCopy"
                          ? "restore"
                          : "activate",
                source_version:
                    message._tag === "RestoreTransactionalCopy"
                        ? message.source_version
                        : 0,
                expected_version: editor.base_version,
                expected_active_version:
                    model.states.find(
                        (state) => state.template_id === editor.template_id
                    )?.active?.version ?? 0,
                copy: editor.copy,
            }),
        ],
    ]
}
