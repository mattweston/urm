import { Effect, Schema } from "effect"
import { Command, File, type Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { Remote } from "foldkit-remote"
import { Surface } from "foldkit-surface"
import {
    CreateMember,
    DeleteMember,
    DomainMembers,
    MemberDetails,
    MemberSummary,
    RemoteMember,
    UpdateMember,
} from "@urm/contracts/members"
import * as Manage from "@urm/features/mail/members/manage"
import { AccountRequestError, ContactsApi } from "../contacts/api.ts"

const CacheModel = Schema.Struct({ remote: Remote.Model })
const CacheMessage = defineMessageUnion({ ...Remote.messages })
const App = Surface.application({
    Model: CacheModel,
    Message: CacheMessage,
    initial: { remote: Remote.initial },
    update: (model: typeof CacheModel.Type) => ({ model }),
})
export const Data = Remote.make({
    model: App.model.remote,
    entities: [RemoteMember],
    queries: [DomainMembers],
    mutations: [CreateMember, UpdateMember, DeleteMember],
})
export const members_page = (domain_id: string) =>
    Data.query(
        DomainMembers,
        { domain_id },
        { select: MemberSummary, first: 200 }
    )
const blank = () => ({
    first: "",
    last: "",
    twitter: "",
    avatar: "",
    notes: "",
})
export const Model = Schema.Struct({
    remote: Remote.Model,
    account_id: Schema.String,
    domain_id: Schema.String,
    can_write: Schema.Boolean,
    epoch: Schema.Number,
    busy: Schema.Boolean,
    error: Schema.NullOr(Schema.String),
    search: Schema.String,
    selected_id: Schema.String,
    form_mode: Manage.Model.fields.formMode,
    draft: Manage.MemberDraft,
    create_id: Schema.NullOr(Schema.String),
    avatar_drop: Manage.Model.fields.avatarDrop,
    avatar_files: Manage.Model.fields.selectedAvatarFiles,
    upload_busy: Schema.Boolean,
})
export type Model = typeof Model.Type
export const initial: Model = {
    remote: Remote.initial,
    account_id: "",
    domain_id: "",
    can_write: false,
    epoch: 0,
    busy: false,
    error: null,
    search: "",
    selected_id: "",
    form_mode: "detail",
    draft: blank(),
    create_id: null,
    avatar_drop: Manage.initDeferred()[0].avatarDrop,
    avatar_files: [],
    upload_busy: false,
}
export const Message = defineMessageUnion({
    Interaction: { message: Manage.Message },
    Refreshed: {},
    AvatarDropResult: { epoch: Schema.Number, message: Manage.Message },
    AvatarUploaded: { epoch: Schema.Number, url: Schema.String },
    AvatarUploadFailed: { epoch: Schema.Number, error: Schema.String },
    PreparedCreate: { epoch: Schema.Number, id: Schema.String },
    Loaded: {
        epoch: Schema.Number,
        remote: Remote.Model,
        saved: Schema.Boolean,
        can_write: Schema.Boolean,
    },
    Failed: {
        epoch: Schema.Number,
        error: Schema.String,
        forbidden: Schema.Boolean,
    },
})
export type Message = typeof Message.Type
type Result = Update.Return<Model, Message, ContactsApi>
const scope_fields = {
    account_id: Schema.String,
    domain_id: Schema.String,
    epoch: Schema.Number,
}
const load_data = Effect.fn("Members.loadData")(function* (domain_id: string) {
    const api = yield* ContactsApi
    const projection = members_page(domain_id)
    const loaded = yield* Data.prefetch(
        { remote: Remote.initial },
        projection
    ).pipe(Effect.provide(api.remote(domain_id)))
    if (projection.read(loaded)._tag !== "Ready")
        return yield* Effect.fail(
            new AccountRequestError({
                status: 0,
                message: "Members could not be loaded. Try Refresh.",
            })
        )
    return loaded.remote
})
const verify = Effect.fn("Members.verifySession")(function* (
    account_id: string,
    domain_id: string,
    write: boolean
) {
    const api = yield* ContactsApi
    const session = yield* api.session()
    return session.account_id !== account_id
        ? undefined
        : session.domains.find(
              (workspace) =>
                  workspace.id === domain_id && (!write || workspace.can_write)
          )
})
const MembersLoad = Command.define("MembersLoad", {
    args: scope_fields,
    messages: [Message.Loaded, Message.Failed],
    execute: ({ account_id, domain_id, epoch }) =>
        Effect.gen(function* () {
            const workspace = yield* verify(account_id, domain_id, false)
            if (workspace === undefined)
                return Message.Failed({
                    epoch,
                    error: "Members access has changed. Sign in again.",
                    forbidden: true,
                })
            return Message.Loaded({
                epoch,
                remote: yield* load_data(domain_id),
                saved: false,
                can_write: workspace.can_write,
            })
        }).pipe(
            Effect.catch(() =>
                Effect.succeed(
                    Message.Failed({
                        epoch,
                        error: "Members could not be loaded. Try Refresh.",
                        forbidden: true,
                    })
                )
            )
        ),
})
const MembersPrepareCreate = Command.define("MembersPrepareCreate", {
    args: { epoch: Schema.Number },
    messages: [Message.PreparedCreate],
    execute: ({ epoch }) =>
        Effect.sync(() =>
            Message.PreparedCreate({ epoch, id: crypto.randomUUID() })
        ),
})
const MembersSave = Command.define("MembersSave", {
    args: {
        ...scope_fields,
        id: Schema.String,
        draft: Manage.MemberDraft,
        action: Schema.Literals(["create", "update", "delete"]),
    },
    messages: [Message.Loaded, Message.Failed],
    execute: ({ account_id, domain_id, epoch, id, draft, action }) =>
        Effect.gen(function* () {
            if ((yield* verify(account_id, domain_id, true)) === undefined)
                return Message.Failed({
                    epoch,
                    error: "Members access has changed. Sign in again.",
                    forbidden: true,
                })
            const api = yield* ContactsApi
            const details =
                action === "delete"
                    ? null
                    : yield* Schema.decodeUnknownEffect(MemberDetails)({
                          first: draft.first.trim(),
                          last: draft.last.trim(),
                          twitter: draft.twitter.trim() || null,
                          avatar: draft.avatar.trim() || null,
                          notes: draft.notes || null,
                      })
            const mutation =
                details === null
                    ? Data.mutate({ remote: Remote.initial }, DeleteMember, {
                          id,
                          domain_id,
                      })
                    : action === "create"
                      ? Data.mutate({ remote: Remote.initial }, CreateMember, {
                            id,
                            domain_id,
                            ...details,
                        })
                      : Data.mutate({ remote: Remote.initial }, UpdateMember, {
                            id,
                            domain_id,
                            ...details,
                        })
            const result = yield* mutation.command.effect.pipe(
                Effect.provide(api.remote(domain_id))
            )
            if (result._tag === "MutationFailed")
                return Message.Failed({
                    epoch,
                    error: "Member could not be saved. Check your access and try again.",
                    forbidden: false,
                })
            return Message.Loaded({
                epoch,
                remote: yield* load_data(domain_id),
                saved: true,
                can_write: true,
            })
        }).pipe(
            Effect.catch(() =>
                Effect.succeed(
                    Message.Failed({
                        epoch,
                        error: "Could not confirm the change. Refresh Members before retrying.",
                        forbidden: false,
                    })
                )
            )
        ),
})
const MembersUploadAvatar = Command.define("MembersUploadAvatar", {
    args: { ...scope_fields, file: File.File },
    messages: [Message.AvatarUploaded, Message.AvatarUploadFailed],
    execute: ({ account_id, domain_id, epoch, file }) =>
        Effect.gen(function* () {
            const api = yield* ContactsApi
            const session = yield* api.session()
            if (
                session.account_id !== account_id ||
                !session.domains.some(
                    (workspace) =>
                        workspace.id === domain_id && workspace.can_write
                )
            ) {
                return yield* Effect.fail(
                    new AccountRequestError({
                        status: 403,
                        message:
                            "Your session cannot upload to this workspace. Refresh Members.",
                    })
                )
            }
            return Message.AvatarUploaded({
                epoch,
                url: yield* api.upload_image(domain_id, file),
            })
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(
                    Message.AvatarUploadFailed({ epoch, error: error.message })
                )
            )
        ),
})
const load = (model: Model): Result => ({
    model: { ...model, busy: true, error: null },
    commands: [
        MembersLoad({
            account_id: model.account_id,
            domain_id: model.domain_id,
            epoch: model.epoch,
        }),
    ],
})
export const synchronize = (
    model: Model,
    scope: { account_id: string; domain_id: string; can_write: boolean } | null
): Result => {
    if (scope === null || scope.domain_id === "")
        return {
            model:
                model.domain_id === ""
                    ? model
                    : { ...initial, epoch: model.epoch + 1 },
        }
    if (
        model.account_id === scope.account_id &&
        model.domain_id === scope.domain_id &&
        model.can_write === scope.can_write
    )
        return { model }
    return load({ ...initial, ...scope, epoch: model.epoch + 1 })
}
export const records = (model: Model) => {
    const page = members_page(model.domain_id).read({ remote: model.remote })
    return page._tag === "Ready"
        ? page.value.items.map((member) => ({
              ...member,
              twitter: member.twitter ?? "",
              avatar: member.avatar ?? "",
              notes: member.notes ?? "",
          }))
        : []
}
export const project = (model: Model): Manage.Model => {
    const [base] = Manage.initDeferred()
    const members = records(model).sort((left, right) =>
        `${left.first} ${left.last}`.localeCompare(
            `${right.first} ${right.last}`
        )
    )
    return {
        ...base,
        members,
        loading: model.busy,
        error: model.error,
        search: model.search,
        selectedMemberId: model.selected_id || members[0]?.id || "",
        formMode: model.form_mode,
        draft: model.draft,
        avatarDrop: model.avatar_drop,
        selectedAvatarFiles: model.avatar_files,
        uploadBusy: model.upload_busy,
        submitting: model.busy || model.upload_busy,
    }
}
export const update = (model: Model, message: Message): Result => {
    if ("epoch" in message && message.epoch !== model.epoch) return { model }
    switch (message._tag) {
        case "AvatarDropResult":
            return update(
                model,
                Message.Interaction({ message: message.message })
            )
        case "AvatarUploaded":
            return {
                model: {
                    ...model,
                    upload_busy: false,
                    avatar_files: [],
                    draft: { ...model.draft, avatar: message.url },
                    error: null,
                },
            }
        case "AvatarUploadFailed":
            return {
                model: { ...model, upload_busy: false, error: message.error },
            }

        case "Loaded":
            return {
                model: {
                    ...model,
                    remote: message.remote,
                    can_write: message.can_write,
                    busy: false,
                    error: null,
                    ...(message.saved
                        ? {
                              form_mode: "detail",
                              draft: blank(),
                              create_id: null,
                              avatar_files: [],
                              upload_busy: false,
                          }
                        : {}),
                },
            }
        case "Failed":
            return {
                model: {
                    ...model,
                    remote: Remote.initial,
                    busy: false,
                    error: message.error,
                    ...(message.forbidden
                        ? {
                              can_write: false,
                              form_mode: "detail",
                              draft: blank(),
                              create_id: null,
                              avatar_files: [],
                              upload_busy: false,
                          }
                        : {}),
                },
            }
        case "PreparedCreate":
            return {
                model: {
                    ...model,
                    busy: false,
                    form_mode: "create",
                    create_id: message.id,
                    avatar_files: [],
                    upload_busy: false,
                    draft: blank(),
                    selected_id: "",
                },
            }
        case "Refreshed":
            return model.busy || model.domain_id === ""
                ? { model }
                : load({
                      ...model,
                      epoch: model.epoch + 1,
                      form_mode: "detail",
                      draft: blank(),
                      create_id: null,
                      avatar_files: [],
                      upload_busy: false,
                  })
        case "Interaction": {
            const interaction = message.message
            if (model.domain_id === "" || model.busy) return { model }
            if (interaction._tag === "MembersSearchChanged")
                return { model: { ...model, search: interaction.value } }
            if (
                interaction._tag === "SelectedMemberChanged" ||
                interaction._tag === "ClosedMemberForm" ||
                (model.can_write &&
                    (interaction._tag === "ClickedEditMember" ||
                        interaction._tag === "UpdatedMemberDraft"))
            ) {
                const [next] = Manage.update(project(model), interaction)
                return {
                    model: {
                        ...model,
                        epoch:
                            interaction._tag === "UpdatedMemberDraft"
                                ? model.epoch
                                : model.epoch + 1,
                        ...(interaction._tag === "UpdatedMemberDraft"
                            ? {}
                            : { avatar_files: [], upload_busy: false }),
                        selected_id: next.selectedMemberId,
                        form_mode: next.formMode,
                        draft: next.draft,
                    },
                }
            }
            if (!model.can_write) return { model }
            if (
                interaction._tag === "GotAvatarDropMessage" ||
                interaction._tag === "RemovedSelectedAvatarFile"
            ) {
                if (model.upload_busy || model.form_mode === "detail")
                    return { model }
                const [next, commands] = Manage.update(
                    project(model),
                    interaction
                )
                return {
                    model: {
                        ...model,
                        avatar_drop: next.avatarDrop,
                        avatar_files: next.selectedAvatarFiles,
                        error: null,
                    },
                    commands: Command.mapMessages(commands, (message) =>
                        Message.AvatarDropResult({
                            epoch: model.epoch,
                            message,
                        })
                    ),
                }
            }
            if (interaction._tag === "ClickedUploadAvatar") {
                const file = model.avatar_files[0]
                if (
                    model.upload_busy ||
                    model.form_mode === "detail" ||
                    file === undefined
                )
                    return { model }
                return {
                    model: { ...model, upload_busy: true, error: null },
                    commands: [
                        MembersUploadAvatar({
                            account_id: model.account_id,
                            domain_id: model.domain_id,
                            epoch: model.epoch,
                            file,
                        }),
                    ],
                }
            }
            if (model.upload_busy) return { model }
            if (interaction._tag === "ClickedCreateMember") {
                const epoch = model.epoch + 1
                return {
                    model: { ...model, epoch, busy: true, error: null },
                    commands: [MembersPrepareCreate({ epoch })],
                }
            }
            if (
                interaction._tag === "SubmittedMemberForm" ||
                interaction._tag === "ClickedDeleteMember"
            ) {
                const remove = interaction._tag === "ClickedDeleteMember"
                const member = remove
                    ? records(model).find(
                          (item) => item.id === interaction.memberId
                      )
                    : undefined
                const id = remove
                    ? member?.id
                    : model.form_mode === "create"
                      ? model.create_id
                      : model.form_mode === "edit"
                        ? model.selected_id
                        : null
                if (!id) return { model }
                const draft = member ?? model.draft
                if (
                    !remove &&
                    !Schema.is(MemberDetails)({
                        first: draft.first.trim(),
                        last: draft.last.trim(),
                        twitter: draft.twitter.trim() || null,
                        avatar: draft.avatar.trim() || null,
                        notes: draft.notes || null,
                    })
                )
                    return {
                        model: {
                            ...model,
                            error: "Enter first and last names and check field lengths.",
                        },
                    }
                const epoch = model.epoch + 1
                return {
                    model: { ...model, epoch, busy: true, error: null },
                    commands: [
                        MembersSave({
                            account_id: model.account_id,
                            domain_id: model.domain_id,
                            epoch,
                            id,
                            draft,
                            action: remove
                                ? "delete"
                                : model.form_mode === "create"
                                  ? "create"
                                  : "update",
                        }),
                    ],
                }
            }
            return { model }
        }
    }
}
