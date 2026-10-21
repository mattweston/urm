import {
    Message as ContactMessage,
    ContactDraft,
    blankContactDraft,
    init as init_contact_ui,
    update as update_contact_ui,
} from "@urm/features/mail/contacts"
import { Effect, Option, Schema } from "effect"
import { Command, type Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { Remote } from "foldkit-remote"
import { AccountSession, AccountDomains } from "@urm/contracts/auth"
import {
    CreateRemoteContact,
    UpdateRemoteContact,
    DeleteRemoteContact,
    ContactDetails,
} from "@urm/contracts/contacts"
import { AccountRequestError, ContactsApi } from "./api.ts"
import { Data, contacts_page } from "./remote.ts"

export const boot_id = crypto.randomUUID()

export const Model = Schema.Struct({
    requested_slug: Schema.NullOr(Schema.String),
    session_only: Schema.Boolean,
    search: Schema.String,
    selected_id: Schema.String,
    creating: Schema.Boolean,
    connection_id: Schema.String,
    session: Schema.NullOr(AccountDomains),
    account: Schema.NullOr(AccountSession),
    domain_id: Schema.String,
    remote: Remote.Model,
    after: Schema.NullOr(Schema.String),
    history: Schema.Array(Schema.NullOr(Schema.String)),
    epoch: Schema.Number,
    busy: Schema.Boolean,
    error: Schema.String,
    logout_pending: Schema.Boolean,
    draft: ContactDraft,
    deleting_id: Schema.NullOr(Schema.String),
    editing_id: Schema.NullOr(Schema.String),
})
export type Model = typeof Model.Type
export const initial: Model = {
    requested_slug: null,
    session_only: false,
    search: "",
    selected_id: "",
    creating: false,
    connection_id: boot_id,
    session: null,
    account: null,
    domain_id: "",
    remote: Remote.initial,
    after: null,
    history: [],
    epoch: 0,
    busy: true,
    error: "",
    logout_pending: false,
    draft: blankContactDraft(),
    deleting_id: null,
    editing_id: null,
}
export const Message = defineMessageUnion({
    ContactInteraction: { message: ContactMessage },
    CancelledCreate: {},
    Boot: {},
    OpenedDomain: {
        slug: Schema.String,
        session_only: Schema.optionalKey(Schema.Boolean),
    },
    SubmittedLogin: {},
    SignedOut: {},
    Refreshed: {},
    ChoseDomain: { id: Schema.String },
    ChangedName: { value: Schema.String },
    ChangedEmail: { value: Schema.String },
    SubmittedCreate: {},
    EditedContact: { id: Schema.String },
    ChangedRename: { value: Schema.String },
    SubmittedRename: {},
    SubmittedDelete: {},
    CancelledRename: {},
    NextPage: {},
    PreviousPage: {},
    SessionLoaded: {
        epoch: Schema.Number,
        session: AccountDomains,
        account: Schema.optionalKey(AccountSession),
    },
    PageLoaded: {
        epoch: Schema.Number,
        remote: Remote.Model,
        session: AccountDomains,
        saved: Schema.Boolean,
    },
    RequestFailed: {
        epoch: Schema.Number,
        message: Schema.String,
        unauthenticated: Schema.Boolean,
    },
    LogoutFinished: { epoch: Schema.Number },
})
export type Message = typeof Message.Type
export const opened_domain = (slug: string, session_only = false) =>
    Message.OpenedDomain({ slug, session_only })
export const sign_out = () => Message.SignedOut()
export const refresh_session = () => Message.Refreshed()
type Result = Update.Return<Model, Message, ContactsApi>

const failure = (epoch: number, error: AccountRequestError) =>
    Message.RequestFailed({
        epoch,
        message: error.message,
        unauthenticated: error.status === 401,
    })
const ContactsLoadSession = Command.define("ContactsLoadSession", {
    args: { epoch: Schema.Number, login: Schema.Boolean },
    messages: [Message.SessionLoaded, Message.RequestFailed],
    execute: ({ epoch, login }) =>
        Effect.gen(function* () {
            const api = yield* ContactsApi
            const session = yield* login ? api.login() : api.session()
            const account = yield* api.account()
            if (account.account_id !== session.account_id)
                return yield* Effect.fail(
                    new AccountRequestError({
                        status: 401,
                        message: "Account session changed. Sign in again.",
                    })
                )
            return Message.SessionLoaded({
                epoch,
                session,
                account,
            })
        }).pipe(
            Effect.catchTag("AccountRequestError", (error) =>
                Effect.succeed(failure(epoch, error))
            )
        ),
})
const ContactsLogout = Command.define("ContactsLogout", {
    args: { epoch: Schema.Number },
    messages: [Message.LogoutFinished, Message.RequestFailed],
    execute: ({ epoch }) =>
        Effect.gen(function* () {
            const api = yield* ContactsApi
            yield* api.logout()
            return Message.LogoutFinished({ epoch })
        }).pipe(
            Effect.catchTag("AccountRequestError", (error) =>
                Effect.succeed(failure(epoch, error))
            )
        ),
})
const ContactsLoadPage = Command.define("ContactsLoadPage", {
    args: {
        epoch: Schema.Number,
        domain_id: Schema.String,
        after: Schema.NullOr(Schema.String),
        search: Schema.String,
    },
    messages: [Message.PageLoaded, Message.RequestFailed],
    execute: ({ epoch, domain_id, after, search }) =>
        Effect.gen(function* () {
            const api = yield* ContactsApi
            const session = yield* api.session()
            if (!session.domains.some((domain) => domain.id === domain_id))
                return Message.RequestFailed({
                    epoch,
                    message:
                        "This domain is no longer available. Sign in again to refresh your domains.",
                    unauthenticated: true,
                })
            const page = contacts_page(domain_id, after, search)
            const loaded = yield* Data.prefetch(
                { remote: Remote.initial },
                page
            ).pipe(Effect.provide(api.remote(domain_id)))
            if (page.read(loaded)._tag !== "Ready")
                return Message.RequestFailed({
                    epoch,
                    message: "Contacts could not be loaded. Try refreshing.",
                    unauthenticated: false,
                })
            return Message.PageLoaded({
                epoch,
                remote: loaded.remote,
                session,
                saved: false,
            })
        }).pipe(
            Effect.catchTag("AccountRequestError", (error) =>
                Effect.succeed(failure(epoch, error))
            ),
            Effect.catch(() =>
                Effect.succeed(
                    Message.RequestFailed({
                        epoch,
                        message:
                            "Contacts could not be loaded. Try refreshing.",
                        unauthenticated: false,
                    })
                )
            )
        ),
})
const ContactsSaveContact = Command.define("ContactsSaveContact", {
    args: {
        epoch: Schema.Number,
        domain_id: Schema.String,
        id: Schema.NullOr(Schema.String),
        draft: ContactDraft,
        remove: Schema.Boolean,
        search: Schema.String,
    },
    messages: [Message.PageLoaded, Message.RequestFailed],
    execute: ({ epoch, domain_id, id, draft, remove, search }) =>
        Effect.gen(function* () {
            const api = yield* ContactsApi
            const session = yield* api.session()
            if (
                !session.domains.some(
                    (domain) => domain.id === domain_id && domain.can_write
                )
            )
                return Message.RequestFailed({
                    epoch,
                    message:
                        "You no longer have permission to edit this domain. Sign in again to refresh access.",
                    unauthenticated: true,
                })
            const details = remove
                ? null
                : yield* Schema.decodeUnknownEffect(ContactDetails)({
                      name: draft.name.trim(),
                      email_addresses: draft.email_addresses.map((item) => ({
                          ...item,
                          email: item.email.trim().toLowerCase(),
                      })),
                      tel: draft.tel.trim() || null,
                      title: draft.title.trim() || null,
                      company: draft.company.trim() || null,
                  })
            const mutation =
                details === null
                    ? Data.mutate(
                          { remote: Remote.initial },
                          DeleteRemoteContact,
                          { id: id ?? "", domain_id }
                      )
                    : id === null
                      ? Data.mutate(
                            { remote: Remote.initial },
                            CreateRemoteContact,
                            {
                                id: crypto.randomUUID(),
                                domain_id,
                                ...details,
                                email:
                                    details.email_addresses.find(
                                        (item) => item.is_primary
                                    )?.email ?? "",
                            }
                        )
                      : Data.mutate(
                            { remote: Remote.initial },
                            UpdateRemoteContact,
                            { id, domain_id, ...details }
                        )
            const settled = yield* mutation.command.effect.pipe(
                Effect.provide(api.remote(domain_id))
            )
            if (settled._tag === "MutationFailed")
                return Message.RequestFailed({
                    epoch,
                    message:
                        "Contact could not be saved. Check the details; the email may already belong to a contact.",
                    unauthenticated: false,
                })
            const page = contacts_page(domain_id, null, search)
            const loaded = yield* Data.prefetch(
                { remote: Remote.initial },
                page
            ).pipe(Effect.provide(api.remote(domain_id)))
            return Message.PageLoaded({
                epoch,
                remote: loaded.remote,
                session,
                saved: true,
            })
        }).pipe(
            Effect.catchTag("AccountRequestError", (error) =>
                Effect.succeed(failure(epoch, error))
            ),
            Effect.catch(() =>
                Effect.succeed(
                    Message.RequestFailed({
                        epoch,
                        message:
                            "Could not confirm the save. Refresh Contacts before trying again.",
                        unauthenticated: false,
                    })
                )
            )
        ),
})

export const init = (): Result => ({ model: initial })
const load = (model: Model): Result => ({
    model: {
        ...model,
        busy: true,
        error: "",
        editing_id: null,
        deleting_id: null,
        creating: false,
    },
    commands: [
        ContactsLoadPage({
            epoch: model.epoch,
            domain_id: model.domain_id,
            after: model.after,
            search: model.search,
        }),
    ],
})
export const domain = (model: Model) =>
    model.session?.domains.find((item) => item.id === model.domain_id)
export const page = (model: Model) =>
    contacts_page(model.domain_id, model.after, model.search).read({
        remote: model.remote,
    })

export const update = (model: Model, message: Message): Result => {
    if (
        message._tag === "OpenedDomain" &&
        model.connection_id === boot_id &&
        model.session !== null &&
        model.requested_slug === message.slug
    ) {
        const next = { ...model, session_only: message.session_only ?? false }
        return model.session_only && !next.session_only
            ? load(next)
            : { model: next }
    }
    if (
        message._tag === "OpenedDomain" &&
        model.connection_id === boot_id &&
        model.session !== null &&
        !model.logout_pending
    ) {
        const selected_domain = model.session.domains.find(
            (item) => item.slug === message.slug
        )
        if (selected_domain !== undefined) {
            const next = {
                ...initial,
                requested_slug: message.slug,
                session_only: message.session_only === true,
                session: model.session,
                account: model.account,
                domain_id: selected_domain.id,
                epoch: model.epoch + 1,
                busy: false,
            }
            return next.session_only ? { model: next } : load(next)
        }
    }
    if (message._tag === "Boot" || message._tag === "OpenedDomain")
        return {
            model: {
                ...initial,
                requested_slug:
                    message._tag === "OpenedDomain" ? message.slug : null,
                session_only:
                    message._tag === "OpenedDomain" &&
                    message.session_only === true,
                epoch: model.epoch + 1,
            },
            commands: [
                ContactsLoadSession({ epoch: model.epoch + 1, login: false }),
            ],
        }
    if (model.connection_id !== boot_id) return { model }
    if ("epoch" in message && message.epoch !== model.epoch) return { model }
    switch (message._tag) {
        case "CancelledCreate":
            return {
                model: {
                    ...model,
                    creating: false,
                    deleting_id: null,
                    draft: blankContactDraft(),
                },
            }
        case "ContactInteraction": {
            const interaction = message.message
            switch (interaction._tag) {
                case "UpdatedContactDraft":
                case "UpdatedContactEmailAddress":
                case "AddedContactEmailAddress":
                case "RemovedContactEmailAddress":
                case "ChangedPrimaryContactEmail": {
                    if (model.busy || !domain(model)?.can_write)
                        return { model }
                    const [base] = init_contact_ui("")
                    const [next] = update_contact_ui(
                        { ...base, contactDraft: model.draft },
                        interaction
                    )
                    return { model: { ...model, draft: next.contactDraft } }
                }
                case "ClickedDeleteContact": {
                    const current = page(model)
                    if (
                        model.busy ||
                        !domain(model)?.can_write ||
                        current._tag !== "Ready" ||
                        !current.value.items.some(
                            (item) => item.id === interaction.contactId
                        )
                    )
                        return { model }
                    return {
                        model: {
                            ...model,
                            deleting_id: interaction.contactId,
                            editing_id: null,
                            creating: false,
                        },
                    }
                }
                case "ConfirmedDeleteContact":
                    return update(model, Message.SubmittedDelete())
                case "ClosedContactDialog":
                    return model.busy
                        ? { model }
                        : update(
                              model,
                              model.creating
                                  ? Message.CancelledCreate()
                                  : Message.CancelledRename()
                          )
                case "SubmittedContactForm":
                    return update(
                        model,
                        model.creating
                            ? Message.SubmittedCreate()
                            : Message.SubmittedRename()
                    )
                case "ContactsSearchChanged": {
                    if (
                        model.session === null ||
                        model.domain_id === "" ||
                        model.creating ||
                        model.editing_id !== null ||
                        model.deleting_id !== null
                    )
                        return { model }
                    const search = interaction.value.slice(0, 255)
                    if (search.trim() === model.search.trim())
                        return { model: { ...model, search } }
                    return load({
                        ...model,
                        search,
                        selected_id: "",
                        remote: Remote.initial,
                        after: null,
                        history: [],
                        epoch: model.epoch + 1,
                    })
                }
                case "SelectedContactChanged":
                    return {
                        model: { ...model, selected_id: interaction.contactId },
                    }
                case "ClickedCreateContact":
                    return model.busy || !domain(model)?.can_write
                        ? { model }
                        : {
                              model: {
                                  ...model,
                                  creating: true,
                                  editing_id: null,
                                  draft: blankContactDraft(),
                                  deleting_id: null,
                              },
                          }
                case "ClickedEditContact":
                    return update(
                        { ...model, creating: false },
                        Message.EditedContact({ id: interaction.contactId })
                    )
                default:
                    return { model }
            }
        }

        case "SubmittedLogin":
            return model.busy || model.logout_pending
                ? { model }
                : {
                      model: {
                          ...model,
                          busy: true,
                          error: "",
                          epoch: model.epoch + 1,
                      },
                      commands: [
                          ContactsLoadSession({
                              epoch: model.epoch + 1,
                              login: true,
                          }),
                      ],
                  }
        case "SessionLoaded": {
            const domain_id =
                (model.requested_slug === null
                    ? message.session.domains[0]
                    : message.session.domains.find(
                          (item) => item.slug === model.requested_slug
                      )
                )?.id ?? ""
            const next = {
                ...initial,
                requested_slug: model.requested_slug,
                session_only: model.session_only,
                session: message.session,
                account: message.account ?? null,
                domain_id,
                epoch: model.epoch + 1,
                busy: false,
            }
            return domain_id === "" || next.session_only
                ? { model: next }
                : load(next)
        }
        case "SignedOut": {
            if (model.busy && model.logout_pending) return { model }
            const epoch = model.epoch + 1
            return {
                model: {
                    ...initial,
                    requested_slug: model.requested_slug,
                    session_only: model.session_only,
                    epoch,
                    logout_pending: true,
                },
                commands: [ContactsLogout({ epoch })],
            }
        }
        case "LogoutFinished":
            return {
                model: {
                    ...initial,
                    requested_slug: model.requested_slug,
                    session_only: model.session_only,
                    epoch: model.epoch,
                    busy: false,
                },
            }
        case "RequestFailed":
            return {
                model: {
                    ...(message.unauthenticated
                        ? {
                              ...initial,
                              requested_slug: model.requested_slug,
                              session_only: model.session_only,
                              epoch: model.epoch,
                              logout_pending: model.logout_pending,
                          }
                        : model),
                    remote: Remote.initial,
                    busy: false,
                    error:
                        model.epoch === 1 && message.unauthenticated
                            ? ""
                            : message.message,
                },
            }
        case "ChoseDomain":
            if (
                model.requested_slug !== null ||
                !model.session?.domains.some(
                    (item) => item.id === message.id
                ) ||
                model.domain_id === message.id
            )
                return { model }
            return load({
                ...model,
                domain_id: message.id,
                search: "",
                selected_id: "",
                creating: false,
                remote: Remote.initial,
                after: null,
                history: [],
                epoch: model.epoch + 1,
                draft: blankContactDraft(),
                deleting_id: null,
                editing_id: null,
            })
        case "Refreshed":
            if (!model.busy && (model.session_only || model.domain_id === ""))
                return {
                    model: {
                        ...model,
                        busy: true,
                        error: "",
                        epoch: model.epoch + 1,
                    },
                    commands: [
                        ContactsLoadSession({
                            epoch: model.epoch + 1,
                            login: false,
                        }),
                    ],
                }
            return model.busy ||
                model.session === null ||
                model.domain_id === ""
                ? { model }
                : load({ ...model, epoch: model.epoch + 1 })
        case "PageLoaded":
            return {
                model: {
                    ...model,
                    session: message.session,
                    remote: message.remote,
                    busy: false,
                    error:
                        contacts_page(
                            model.domain_id,
                            message.saved ? null : model.after,
                            model.search
                        ).read({ remote: message.remote })._tag === "Ready"
                            ? ""
                            : "Contact saved, but the list could not be refreshed. Select Refresh to try again.",
                    ...(message.saved
                        ? {
                              creating: false,
                              draft: blankContactDraft(),
                              deleting_id: null,
                              editing_id: null,
                              after: null,
                              history: [],
                          }
                        : {}),
                },
            }
        case "ChangedName":
        case "ChangedRename":
            return {
                model: {
                    ...model,
                    draft: { ...model.draft, name: message.value },
                },
            }
        case "ChangedEmail":
            return {
                model: {
                    ...model,
                    draft: {
                        ...model.draft,
                        email_addresses: [
                            { email: message.value, is_primary: true },
                        ],
                    },
                },
            }
        case "CancelledRename":
            return {
                model: {
                    ...model,
                    editing_id: null,
                    deleting_id: null,
                    draft: blankContactDraft(),
                },
            }
        case "EditedContact": {
            const current = page(model)
            const contact =
                current._tag === "Ready"
                    ? current.value.items.find((item) => item.id === message.id)
                    : undefined
            return contact === undefined ||
                model.busy ||
                !domain(model)?.can_write
                ? { model }
                : {
                      model: {
                          ...model,
                          editing_id: contact.id,
                          draft: {
                              name: contact.name,
                              email_addresses: contact.email_addresses.map(
                                  ({ email, is_primary }) => ({
                                      email,
                                      is_primary,
                                  })
                              ),
                              tel: contact.tel ?? "",
                              title: contact.title ?? "",
                              company: contact.company ?? "",
                          },
                      },
                  }
        }
        case "SubmittedCreate":
        case "SubmittedRename":
        case "SubmittedDelete": {
            if (model.busy || !domain(model)?.can_write) return { model }
            const remove = message._tag === "SubmittedDelete"
            const id = remove
                ? model.deleting_id
                : message._tag === "SubmittedCreate"
                  ? null
                  : model.editing_id
            if (message._tag !== "SubmittedCreate" && id === null)
                return { model }
            const valid = Schema.decodeUnknownOption(ContactDetails)({
                name: model.draft.name.trim(),
                email_addresses: model.draft.email_addresses.map((item) => ({
                    ...item,
                    email: item.email.trim().toLowerCase(),
                })),
                tel: model.draft.tel.trim() || null,
                title: model.draft.title.trim() || null,
                company: model.draft.company.trim() || null,
            })
            if (!remove && Option.isNone(valid))
                return {
                    model: {
                        ...model,
                        error: "Enter a name, unique valid email addresses and exactly one primary email. Check field lengths.",
                    },
                }
            const epoch = model.epoch + 1
            return {
                model: { ...model, busy: true, error: "", epoch },
                commands: [
                    ContactsSaveContact({
                        epoch,
                        domain_id: model.domain_id,
                        id,
                        draft: model.draft,
                        remove,
                        search: model.search,
                    }),
                ],
            }
        }
        case "NextPage": {
            if (model.busy || model.session === null) return { model }
            const next = Data.next(
                { remote: model.remote },
                contacts_page(model.domain_id, model.after, model.search)
            )?.window.after
            return next === undefined
                ? { model }
                : load({
                      ...model,
                      after: next,
                      history: [...model.history, model.after],
                      epoch: model.epoch + 1,
                  })
        }
        case "PreviousPage": {
            if (model.busy || model.history.length === 0) return { model }
            return load({
                ...model,
                after: model.history.at(-1) ?? null,
                history: model.history.slice(0, -1),
                epoch: model.epoch + 1,
            })
        }
    }
}
