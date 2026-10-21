import { Clock, Effect, Option, Schema as S, Struct } from "effect"
import { Command, File, Submodel, Subscription } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { taggedStruct } from "foldkit/schema"
import { Remote, RemoteData } from "foldkit-remote"
import { Surface } from "foldkit-surface"
import {
    DocumentLibrary,
    DocumentLibrarySummary,
    WorkspaceDocuments,
    ChangeDocuments,
    DocumentFields,
    DocumentTemplateFields,
    DocumentAction,
} from "@urm/contracts/documents"
import * as Documents from "@urm/features/documents/submodel"
import { ContactsApi, AccountRequestError } from "../contacts/api.ts"
import {
    RichTextEditorMessage,
    UploadedImage,
    FailedUploadImage,
    ResolvedRichTextImageUrls,
} from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.schema.ts"

const ui_schema = S.Struct(
    Struct.omit(Documents.Model.fields, ["documents", "can_write"])
)
const ui_only = (model: Documents.ModelType) =>
    Struct.omit(model, ["documents", "can_write"])
export const Model = S.Struct({
    ui: ui_schema,
    remote: Remote.Model,
    account_id: S.String,
    domain_id: S.String,
    can_write: S.Boolean,
    epoch: S.Number,
    editor_epoch: S.Number,
    pending: S.Boolean,
})
export type Model = typeof Model.Type
const Loaded = taggedStruct("DocumentsLoaded", {
    epoch: S.Number,
    editor_epoch: S.Number,
    remote: Remote.Model,
    saved_id: S.NullOr(S.String),
    saved_template: S.Boolean,
    from_template: S.Boolean,
})
const Saved = taggedStruct("DocumentsSaved", {
    ...Struct.omit(Loaded.fields, ["_tag", "remote"]),
    settlement: taggedStruct(
        "MutationSucceeded",
        Remote.messages.MutationSucceeded
    ),
})
const Failed = taggedStruct("DocumentsFailed", {
    epoch: S.Number,
    editor_epoch: S.Number,
    error: S.String,
    template: S.Boolean,
})
const ImageResult = taggedStruct("DocumentImageResult", {
    epoch: S.Number,
    editor_epoch: S.Number,
    message: RichTextEditorMessage,
})
export const UseTemplate = taggedStruct("UseDocumentTemplate", {
    template_id: S.String,
})
export const Refreshed = taggedStruct("DocumentsRefreshed")
export const Message = S.Union([
    Documents.Message,
    Loaded,
    Saved,
    Failed,
    ImageResult,
    UseTemplate,
    Refreshed,
])
export type Message = typeof Message.Type
export type UpdateReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<Message, never, ContactsApi>>,
]
const CacheModel = S.Struct({ remote: Remote.Model })
const Cache = Surface.application({
    Model: CacheModel,
    Message: defineMessageUnion({ ...Remote.messages }),
    initial: { remote: Remote.initial },
    update: (model: typeof CacheModel.Type) => ({ model }),
})
export const Data = Remote.make({
    model: Cache.model.remote,
    entities: [DocumentLibrary],
    queries: [WorkspaceDocuments],
    mutations: [ChangeDocuments],
})
const query = (domain_id: string) =>
    Data.query(
        WorkspaceDocuments,
        { domain_id },
        { select: DocumentLibrarySummary, first: 1 }
    )
const read = (model: Model) =>
    query(model.domain_id).read({ remote: model.remote })
/** The row on its own, for callers that need only the value. */
export const library = (model: Model) => {
    const result = read(model)
    return result._tag === "Ready" ? result.value.items[0] : undefined
}
export const project = (model: Model): Documents.ModelType => {
    const base = {
        ...model.ui,
        can_write: model.can_write && !model.pending,
    }
    // `load_status` also carries "saving" from a mutation, so the read's status
    // must not overwrite a save in flight.
    const status = (from_read: "loading" | "ready" | "error") =>
        model.ui.load_status === "saving" ? ("saving" as const) : from_read
    return RemoteData.render(read(model), {
        loading: (): Documents.ModelType => ({
            ...base,
            documents: [],
            load_status: status("loading"),
            maybe_error: Option.none(),
        }),
        notFound: (): Documents.ModelType => ({
            ...base,
            documents: [],
            load_status: status("ready"),
            maybe_error: Option.none(),
        }),
        failed: (error): Documents.ModelType => ({
            ...base,
            documents: [],
            load_status: status("error"),
            maybe_error: Option.some(error.message),
        }),
        data: (page, freshness): Documents.ModelType => ({
            ...base,
            documents: page.items[0]?.documents ?? [],
            load_status: status(
                freshness._tag === "Refreshing" ? "loading" : "ready"
            ),
            maybe_error:
                freshness._tag === "Stale"
                    ? Option.some(freshness.error.message)
                    : Option.none(),
        }),
    })
}
export const init = (location: string): Model => ({
    ui: ui_only(Documents.init(location)[0]),
    remote: Remote.initial,
    account_id: "",
    domain_id: "",
    can_write: false,
    epoch: 0,
    editor_epoch: 0,
    pending: false,
})
export const clear = (model: Model): Model => ({
    ...init("/content/documents"),
    ui: {
        ...ui_only(Documents.init("/content/documents")[0]),
        route: model.ui.route,
        document_id: model.ui.document_id,
    },
    epoch: model.epoch + 1,
})
const scope_fields = {
    account_id: S.String,
    domain_id: S.String,
    epoch: S.Number,
    editor_epoch: S.Number,
}
const check_session = Effect.fn("Documents.checkSession")(function* (
    account_id: string,
    domain_id: string,
    write: boolean
) {
    const api = yield* ContactsApi
    const session = yield* api.session()
    if (
        session.account_id !== account_id ||
        !session.domains.some(
            (workspace) =>
                workspace.id === domain_id && (!write || workspace.can_write)
        )
    )
        return yield* Effect.fail(
            new AccountRequestError({
                status: 403,
                message: "Document access changed. Sign in or refresh.",
            })
        )
    return api
})
const read_library = Effect.fn("Documents.read")(function* (domain_id: string) {
    const api = yield* ContactsApi
    const loaded = yield* Data.prefetch(
        { remote: Remote.initial },
        query(domain_id)
    ).pipe(Effect.provide(api.remote(domain_id)))
    if (query(domain_id).read(loaded)._tag !== "Ready")
        return yield* Effect.fail(
            new AccountRequestError({
                status: 403,
                message: "Documents could not be loaded.",
            })
        )
    return loaded.remote
})
const LoadDocumentLibrary = Command.define("LoadDocumentLibrary", {
    args: scope_fields,
    messages: [Loaded, Failed],
    execute: ({ account_id, domain_id, epoch, editor_epoch }) =>
        Effect.gen(function* () {
            yield* check_session(account_id, domain_id, false)
            return Loaded({
                epoch,
                editor_epoch,
                remote: yield* read_library(domain_id),
                saved_id: null,
                saved_template: false,
                from_template: false,
            })
        }).pipe(
            Effect.catch(() =>
                Effect.succeed(
                    Failed({
                        epoch,
                        editor_epoch,
                        template: false,
                        error: "Documents could not be loaded. Check workspace access and refresh.",
                    })
                )
            )
        ),
})
const ChangeDocumentLibrary = Command.define("ChangeDocumentLibrary", {
    args: { ...scope_fields, action: DocumentAction },
    messages: [Saved, Failed],
    execute: ({
        account_id,
        domain_id,
        epoch,
        editor_epoch,
        action: requested_action,
    }) =>
        Effect.gen(function* () {
            const api = yield* ContactsApi
            const action =
                requested_action.id === ""
                    ? { ...requested_action, id: crypto.randomUUID() }
                    : requested_action
            const request_id = crypto.randomUUID()
            const outcome = yield* Remote.mutate(
                ChangeDocuments,
                { domain_id, account_id, action },
                request_id
            ).pipe(Effect.provide(api.remote(domain_id)))
            return Saved({
                epoch,
                editor_epoch,
                settlement: {
                    _tag: "MutationSucceeded",
                    requestId: request_id,
                    entities: outcome.entities,
                    connections: outcome.connections,
                    now: yield* Clock.currentTimeMillis,
                },
                saved_id:
                    action._tag === "create" ||
                    action._tag === "update" ||
                    action._tag === "from_template"
                        ? action.id
                        : null,
                saved_template: requested_action._tag === "save_template",
                from_template: action._tag === "from_template",
            })
        }).pipe(
            Effect.catch(() =>
                Effect.succeed(
                    Failed({
                        epoch,
                        editor_epoch,
                        template: requested_action._tag === "save_template",
                        error: "Document could not be saved. Check access and field limits, or refresh before retrying.",
                    })
                )
            )
        ),
})
const UploadDocumentImage = Command.define("UploadDocumentImage", {
    args: { ...scope_fields, file: File.File },
    messages: [ImageResult],
    execute: ({ account_id, domain_id, epoch, editor_epoch, file }) =>
        Effect.gen(function* () {
            const api = yield* check_session(account_id, domain_id, true)
            const src = yield* api.upload_image(domain_id, file, "Documents")
            return ImageResult({
                epoch,
                editor_epoch,
                message: UploadedImage({
                    src,
                    alt: file.name || "Image",
                    resolved_src: src,
                }),
            })
        }).pipe(
            Effect.catch(() =>
                Effect.succeed(
                    ImageResult({
                        epoch,
                        editor_epoch,
                        message: FailedUploadImage({
                            error: "Image upload failed. Check workspace access and try again.",
                        }),
                    })
                )
            )
        ),
})
const ResolveDocumentImages = Command.define("ResolveDocumentImages", {
    args: { epoch: S.Number, editor_epoch: S.Number, urls: S.Array(S.String) },
    messages: [ImageResult],
    execute: ({ epoch, editor_epoch, urls }) =>
        Effect.succeed(
            ImageResult({
                epoch,
                editor_epoch,
                message: ResolvedRichTextImageUrls({
                    images: urls.map((url) => ({ stored_url: url, url })),
                }),
            })
        ),
})
const SaveArgs = S.Struct({
    document_id: S.NullOr(S.String),
    title: S.String,
    content: S.String,
    status: S.String,
})
const UploadArgs = S.Struct({ file: File.File })
const ResolveArgs = S.Struct({ urls: S.Array(S.String) })
const translate = (
    model: Model,
    command: Command.Command<Documents.MessageType>
): UpdateReturn[1] => {
    const scope = {
        account_id: model.account_id,
        domain_id: model.domain_id,
        epoch: model.epoch,
        editor_epoch: model.editor_epoch,
    }
    if (
        command.name === "UploadRichTextImage" &&
        S.is(UploadArgs)(command.args)
    )
        return [
            UploadDocumentImage({
                ...scope,
                editor_epoch: model.editor_epoch,
                file: command.args.file,
            }),
        ]
    if (
        command.name === "ResolveRichTextImageUrls" &&
        S.is(ResolveArgs)(command.args)
    )
        return [
            ResolveDocumentImages({
                epoch: model.epoch,
                editor_epoch: model.editor_epoch,
                urls: command.args.urls,
            }),
        ]
    if (command.name === "SaveDocument" && S.is(SaveArgs)(command.args)) {
        const fields = S.decodeUnknownOption(DocumentFields)({
            ...command.args,
            content_type: "rich_text_json",
        })
        return Option.isNone(fields)
            ? [command]
            : [
                  ChangeDocumentLibrary({
                      ...scope,
                      action: {
                          _tag:
                              command.args.document_id === null
                                  ? "create"
                                  : "update",
                          id: command.args.document_id ?? "",
                          ...fields.value,
                      },
                  }),
              ]
    }
    if (
        command.name === "SaveDocumentTemplate" &&
        S.is(DocumentTemplateFields)(command.args)
    )
        return [
            ChangeDocumentLibrary({
                ...scope,
                action: {
                    _tag: "save_template",
                    id: "",
                    expected_revision: 0,
                    ...command.args,
                },
            }),
        ]
    return [command]
}
export const synchronize = (
    model: Model,
    scope: { account_id: string; domain_id: string; can_write: boolean } | null
): UpdateReturn => {
    if (scope === null || scope.domain_id === "")
        return [model.domain_id === "" ? model : clear(model), []]
    if (
        scope.account_id === model.account_id &&
        scope.domain_id === model.domain_id &&
        scope.can_write === model.can_write
    )
        return [model, []]
    const next = { ...clear(model), ...scope, pending: true }
    return [
        next,
        [
            LoadDocumentLibrary({
                ...scope,
                epoch: next.epoch,
                editor_epoch: next.editor_epoch,
            }),
        ],
    ]
}
export const update = (model: Model, message: Message): UpdateReturn => {
    if ("epoch" in message && message.epoch !== model.epoch) return [model, []]
    if (
        message._tag === "DocumentsLoaded" ||
        message._tag === "DocumentsSaved"
    ) {
        const next = {
            ...model,
            remote:
                message._tag === "DocumentsSaved"
                    ? Data.reduce(model, message.settlement).remote
                    : message.remote,
            pending: false,
        }
        let feature = Documents.update(
            project(next),
            Documents.LoadedDocuments({
                documents: library(next)?.documents ?? [],
            })
        )[0]
        let commands: ReadonlyArray<Command.Command<Documents.MessageType>> = []
        if (
            message.saved_id !== null &&
            message.editor_epoch === model.editor_epoch
        ) {
            const document = feature.documents.find(
                (item) => item.id === message.saved_id
            )
            if (document !== undefined)
                [feature, commands] = Documents.update(
                    message.from_template
                        ? { ...feature, route: "New" }
                        : feature,
                    Documents.SavedDocument({ document })
                )
        }
        if (
            message.saved_template &&
            message.editor_epoch === model.editor_epoch
        )
            [feature, commands] = Documents.update(
                feature,
                Documents.SavedDocumentTemplate()
            )
        return [
            { ...next, ui: ui_only(feature) },
            commands.flatMap((command) => translate(next, command)),
        ]
    }
    if (message._tag === "DocumentsFailed") {
        const next = { ...model, pending: false }
        if (message.editor_epoch !== model.editor_epoch) return [next, []]
        const feature = Documents.update(
            project(next),
            message.template
                ? Documents.FailedSavingDocumentTemplate({
                      error: message.error,
                  })
                : Documents.FailedDocumentOperation({ error: message.error })
        )[0]
        return [{ ...next, ui: ui_only(feature) }, []]
    }
    if (message._tag === "DocumentsRefreshed")
        return model.domain_id === "" || model.pending
            ? [model, []]
            : [
                  { ...model, pending: true },
                  [
                      LoadDocumentLibrary({
                          account_id: model.account_id,
                          domain_id: model.domain_id,
                          epoch: model.epoch,
                          editor_epoch: model.editor_epoch,
                      }),
                  ],
              ]
    if (message._tag === "UseDocumentTemplate")
        return !model.can_write || model.pending
            ? [model, []]
            : [
                  { ...model, pending: true },
                  [
                      ChangeDocumentLibrary({
                          account_id: model.account_id,
                          domain_id: model.domain_id,
                          epoch: model.epoch,
                          editor_epoch: model.editor_epoch,
                          action: {
                              _tag: "from_template",
                              id: "",
                              template_id: message.template_id,
                          },
                      }),
                  ],
              ]
    if (message._tag === "DocumentImageResult")
        return message.editor_epoch !== model.editor_epoch
            ? [model, []]
            : apply_feature(
                  model,
                  Documents.GotDocumentEditorMessage({
                      message: message.message,
                  })
              )
    if (
        message._tag === "LoadedDocuments" ||
        message._tag === "SavedDocument" ||
        message._tag === "SavedDocumentTemplate"
    )
        return [model, []]
    if (
        message._tag !== "ChangedLocation" &&
        message._tag !== "CompletedDocumentNavigation" &&
        (!model.can_write || model.pending)
    )
        return [model, []]
    return apply_feature(model, message)
}
const apply_feature = (
    model: Model,
    message: Documents.MessageType
): UpdateReturn => {
    const [feature, commands] = Documents.update(project(model), message)
    const next = {
        ...model,
        ui: ui_only(feature),
        editor_epoch:
            message._tag === "ChangedLocation"
                ? model.editor_epoch + 1
                : model.editor_epoch,
    }
    const translated = commands.flatMap((command) => translate(next, command))
    return [
        {
            ...next,
            pending:
                model.pending ||
                translated.some(
                    (command) => command.name === "ChangeDocumentLibrary"
                ),
        },
        translated,
    ]
}
export const changed_url = (model: Model, location: string): UpdateReturn =>
    update(model, Documents.ChangedLocation({ location }))
export const subscriptions = Subscription.lift(Documents.subscriptions)<
    Model,
    Message
>({
    read: (model) => Option.some(project(model)),
    toParentMessage: (message) => message,
})
export const view = Submodel.defineView<Model, Message, Documents.ViewInputs>(
    (model, inputs, h) =>
        h.div(
            [],
            [
                ...(model.ui.load_status === "error"
                    ? [
                          h.button(
                              [
                                  h.Type("button"),
                                  h.OnClick(Refreshed()),
                                  h.Class(
                                      "m-4 rounded border border-border px-3 py-2 text-sm"
                                  ),
                              ],
                              ["Retry loading documents"]
                          ),
                      ]
                    : []),
                h.submodel({
                    slotId: "documents-ui",
                    model: project(model),
                    view: Documents.view,
                    viewInputs: inputs,
                    toParentMessage: (message) => message,
                }),
            ]
        )
)
export const is_document_location = Documents.is_document_location
export const title_for_route = (model: Model) =>
    Documents.title_for_route(project(model))
