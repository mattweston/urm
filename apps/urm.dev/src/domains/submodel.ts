import { Effect, Option, Schema as S, Struct } from "effect"
import { Command, Submodel } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { defineMessageUnion } from "foldkit/message"
import { Remote, RemoteData, RemoteMutationError } from "foldkit-remote"
import { Surface } from "foldkit-surface"
import * as Domains from "@urm/features/domains/publishing"
import { SubdomainAction, SubdomainFields } from "@urm/domain/subdomains"
import {
    SubdomainCatalog,
    SubdomainSummary,
    DomainSubdomains,
    ChangeSubdomains,
} from "@urm/contracts/subdomains"
import { AccountDomain } from "@urm/contracts/auth"
import { ContactsApi, AccountRequestError } from "../contacts/api.ts"
import { pagesSubdomainHref } from "../routing/route.ts"
export {
    CancelledDeleteDomain,
    CancelledDeleteSubdomain,
    CancelledDomainEdit,
    CancelledSubdomainEdit,
    ChangedEditingDomainName,
    ChangedEditingSubdomainAccess,
    ChangedEditingSubdomainExpiry,
    ChangedEditingSubdomainName,
    ChangedEditingSubdomainKind,
    ChangedEditingSubdomainSlug,
    ChangedEditingSubdomainStatus,
    ChangedNewDomainName,
    ChangedNewSubdomainAccess,
    ChangedNewSubdomainExpiry,
    ChangedNewSubdomainName,
    ChangedNewSubdomainKind,
    ChangedNewSubdomainSlug,
    ChangedNewSubdomainStatus,
    ConfirmedDeleteDomain,
    ConfirmedDeleteSubdomain,
    FailedDomainAction,
    LoadedSubdomains,
    RequestedDeleteDomain,
    RequestedDeleteSubdomain,
    SubdomainAccess,
    SubdomainKind,
    SubdomainStatus,
    StartedEditingDomain,
    StartedEditingSubdomain,
    SubmittedDomainEdit,
    SubmittedNewDomain,
    SubmittedNewSubdomain,
    SubmittedSubdomainEdit,
    SucceededCreateDomain,
    SucceededCreateSubdomain,
    SucceededDeleteDomain,
    SucceededDeleteSubdomain,
    SucceededUpdateDomain,
    SucceededUpdateSubdomain,
} from "@urm/features/domains/publishing"
export type MessageType = Message
export type ModelType = Model

const ui_schema = S.Struct(Struct.omit(Domains.Model.fields, ["subdomains"]))
const ui_only = (model: Domains.Model) => Struct.omit(model, ["subdomains"])
export const Model = S.Struct({
    ui: ui_schema,
    remote: Remote.Model,
    account_id: S.String,
    domain_id: S.String,
    can_write: S.Boolean,
    epoch: S.Number,
    pending: S.Boolean,
})
export type Model = typeof Model.Type
const Loaded = taggedStruct("SubdomainsLoaded", {
    epoch: S.Number,
    remote: Remote.Model,
    operation: S.String,
})
const Failed = taggedStruct("SubdomainsFailed", {
    epoch: S.Number,
    error: S.String,
})
export const DomainChanged = taggedStruct("DomainChanged", {
    epoch: S.Number,
    operation: S.Literals(["create", "update", "delete"]),
    domain_id: S.String,
    slug: S.String,
})
export const Refreshed = taggedStruct("SubdomainsRefreshed")
export const Message = S.Union([
    Domains.Message,
    Loaded,
    Failed,
    Refreshed,
    DomainChanged,
])
export type Message = typeof Message.Type
export type UpdateReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<Message, never, ContactsApi>>,
]
export const init = (): Model => ({
    ui: ui_only(Domains.init()),
    remote: Remote.initial,
    account_id: "",
    domain_id: "",
    can_write: false,
    epoch: 0,
    pending: false,
})
export const clear_subdomains = (model: Model): Model => ({
    ...init(),
    epoch: model.epoch + 1,
})
const Cache = Surface.application({
    Model: S.Struct({ remote: Remote.Model }),
    Message: defineMessageUnion({ ...Remote.messages }),
    initial: { remote: Remote.initial },
    update: (model: { readonly remote: typeof Remote.Model.Type }) => ({
        model,
    }),
})
export const Data = Remote.make({
    model: Cache.model.remote,
    entities: [SubdomainCatalog],
    queries: [DomainSubdomains],
    mutations: [ChangeSubdomains],
})
const query = (domain_id: string) =>
    Data.query(
        DomainSubdomains,
        { domain_id },
        { select: SubdomainSummary, first: 1 }
    )
export const library = (model: Model) =>
    query(model.domain_id).read({ remote: model.remote })
export const project = (model: Model): Domains.Model => {
    const base = { ...model.ui, busy: model.pending || model.ui.busy }
    // Generic: naming only `expires_at` would narrow the element and drop
    // every other field off the spread.
    const rows = <T extends { readonly expires_at: number | null }>(
        subdomains: ReadonlyArray<T>
    ) =>
        subdomains.map(({ expires_at, ...row }) => ({
            ...row,
            ...(expires_at === null ? {} : { expires_at }),
        }))
    return RemoteData.render(library(model), {
        // Was `model.pending && library(model) === undefined`, which inferred
        // "loading" from a missing value and so stayed false for a failed read.
        loading: (): Domains.Model => ({
            ...base,
            subdomains: [],
            loading_subdomains: true,
            error: Option.none(),
        }),
        notFound: (): Domains.Model => ({
            ...base,
            subdomains: [],
            loading_subdomains: false,
            error: Option.none(),
        }),
        failed: (error): Domains.Model => ({
            ...base,
            subdomains: [],
            loading_subdomains: false,
            error: Option.some(error.message),
        }),
        data: (page, freshness): Domains.Model => ({
            ...base,
            subdomains: rows(page.items[0]?.subdomains ?? []),
            loading_subdomains: freshness._tag === "Refreshing",
            error:
                freshness._tag === "Stale"
                    ? Option.some(freshness.error.message)
                    : Option.none(),
        }),
    })
}
const LoadSubdomainCatalog = Command.define("LoadSubdomainCatalog", {
    args: {
        account_id: S.String,
        domain_id: S.String,
        epoch: S.Number,
        action: S.optional(SubdomainAction),
    },
    messages: [Loaded, Failed],
    execute: (args) =>
        Effect.gen(function* () {
            const api = yield* ContactsApi
            const session = yield* api.session()
            if (
                session.account_id !== args.account_id ||
                !session.domains.some(
                    (w) =>
                        w.id === args.domain_id &&
                        (args.action === undefined || w.can_write)
                )
            )
                return yield* Effect.fail(
                    new AccountRequestError({
                        status: 403,
                        message: "Subdomain access changed.",
                    })
                )
            if (args.action !== undefined)
                yield* Remote.mutate(
                    ChangeSubdomains,
                    { domain_id: args.domain_id, action: args.action },
                    crypto.randomUUID()
                ).pipe(Effect.provide(api.remote(args.domain_id)))
            const loaded = yield* Data.prefetch(
                { remote: Remote.initial },
                query(args.domain_id)
            ).pipe(Effect.provide(api.remote(args.domain_id)))
            if (query(args.domain_id).read(loaded)._tag !== "Ready")
                return yield* Effect.fail(
                    new AccountRequestError({
                        status: 503,
                        message: "Subdomains unavailable.",
                    })
                )
            return Loaded({
                epoch: args.epoch,
                remote: loaded.remote,
                operation: args.action?._tag ?? "load",
            })
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(
                    Failed({
                        epoch: args.epoch,
                        error:
                            error instanceof RemoteMutationError ||
                            error instanceof AccountRequestError
                                ? error.message
                                : "Could not load subdomains. Check the server connection and retry.",
                    })
                )
            )
        ),
})
const scope = (model: Model) => ({
    account_id: model.account_id,
    domain_id: model.domain_id,
    epoch: model.epoch,
})
export const synchronize = (
    model: Model,
    account: {
        account_id: string
        domain_id: string
        can_write: boolean
    } | null
): UpdateReturn => {
    if (account === null || account.domain_id === "")
        return [model.domain_id === "" ? model : clear_subdomains(model), []]
    if (
        model.account_id === account.account_id &&
        model.domain_id === account.domain_id &&
        model.can_write === account.can_write
    )
        return [model, []]
    const next = { ...clear_subdomains(model), ...account, pending: true }
    return [next, [LoadSubdomainCatalog(scope(next))]]
}
const DomainMutation = Command.define("DomainMutation", {
    args: {
        epoch: S.Number,
        account_id: S.String,
        operation: S.Literals(["create", "update", "delete"]),
        domain_id: S.String,
        name: S.String,
        slug: S.String,
    },
    messages: [DomainChanged, Domains.FailedDomainAction],
    execute: (args) =>
        Effect.gen(function* () {
            const api = yield* ContactsApi
            const current = yield* api.session()
            if (current.account_id !== args.account_id)
                return yield* Effect.fail(
                    new AccountRequestError({
                        status: 403,
                        message: "Account access changed. Sign in again.",
                    })
                )
            const session = yield* args.operation === "create"
                ? api.create_domain({ name: args.name, slug: args.slug })
                : args.operation === "update"
                  ? api.update_domain({
                        domain_id: args.domain_id,
                        name: args.name,
                        slug: args.slug,
                    })
                  : api.delete_domain({ domain_id: args.domain_id })
            const domain = session.domains.find((item) =>
                args.operation === "create"
                    ? item.slug === args.slug
                    : item.id === args.domain_id
            )
            return DomainChanged({
                epoch: args.epoch,
                operation: args.operation,
                domain_id: domain?.id ?? args.domain_id,
                slug: domain?.slug ?? args.slug,
            })
        }).pipe(
            Effect.catchTag("AccountRequestError", (error) =>
                Effect.succeed(
                    Domains.FailedDomainAction({ error: error.message })
                )
            )
        ),
})
const domain_command = (
    command: Command.Command<Domains.Message>,
    epoch: number,
    account_id: string
) => {
    const args = S.decodeUnknownOption(
        S.Struct({
            domain_id: S.optional(S.String),
            name: S.optional(S.String),
            slug: S.optional(S.String),
        })
    )(command.args)
    if (Option.isNone(args)) return []
    const operation =
        command.name === "CreateDomain"
            ? "create"
            : command.name === "UpdateDomain"
              ? "update"
              : command.name === "DeleteDomain"
                ? "delete"
                : undefined
    return operation === undefined
        ? []
        : [
              DomainMutation({
                  epoch,
                  account_id,
                  operation,
                  domain_id: args.value.domain_id ?? "",
                  name: args.value.name ?? "",
                  slug: args.value.slug ?? "",
              }),
          ]
}
export const update = (
    model: Model,
    message: Message,
    domains: ReadonlyArray<AccountDomain> = [],
    active_domain_id: Option.Option<string> = Option.none()
): UpdateReturn => {
    if ("epoch" in message && message.epoch !== model.epoch) return [model, []]
    if (message._tag === "DomainChanged") {
        const feedback =
            message.operation === "create"
                ? Domains.SucceededCreateDomain({
                      domain: {
                          id: message.domain_id,
                          name: model.ui.new_domain_name.trim(),
                          slug: message.slug,
                          updated_at: 0,
                      },
                  })
                : message.operation === "update"
                  ? Domains.SucceededUpdateDomain()
                  : Domains.SucceededDeleteDomain()
        return [
            {
                ...model,
                ui: ui_only(
                    Domains.update(
                        project(model),
                        feedback,
                        [],
                        active_domain_id
                    )[0]
                ),
            },
            [],
        ]
    }
    if (message._tag === "SubdomainsLoaded") {
        const next = {
            ...model,
            remote: message.remote,
            pending: false,
            ui: { ...model.ui, busy: false, error: Option.none<string>() },
        }
        const feedback =
            message.operation === "create"
                ? Domains.SucceededCreateSubdomain()
                : message.operation === "update"
                  ? Domains.SucceededUpdateSubdomain()
                  : message.operation === "delete"
                    ? Domains.SucceededDeleteSubdomain()
                    : undefined
        return feedback === undefined
            ? [next, []]
            : [
                  {
                      ...next,
                      ui: ui_only(
                          Domains.update(
                              project(next),
                              feedback,
                              [],
                              Option.some(next.domain_id)
                          )[0]
                      ),
                  },
                  [],
              ]
    }
    if (message._tag === "SubdomainsFailed")
        return [
            {
                ...model,
                pending: false,
                ui: {
                    ...model.ui,
                    busy: false,
                    error: Option.some(message.error),
                    loading_subdomains: false,
                },
            },
            [],
        ]
    if (message._tag === "SubdomainsRefreshed")
        return model.pending || model.domain_id === ""
            ? [model, []]
            : [
                  { ...model, pending: true },
                  [LoadSubdomainCatalog(scope(model))],
              ]
    if (message._tag === "LoadedSubdomains") return [model, []]
    const is_subdomain = message._tag.includes("Subdomain")
    if (is_subdomain) {
        if (!model.can_write || model.pending || model.domain_id === "")
            return [model, []]
        const [ui, commands] = Domains.update(
            project(model),
            message,
            [],
            Option.some(model.domain_id)
        )
        const command = commands[0]
        if (command === undefined) return [{ ...model, ui: ui_only(ui) }, []]
        const args = S.decodeUnknownOption(
            S.Union([
                S.Struct({
                    ...SubdomainFields.fields,
                    subdomain_id: S.optional(S.String),
                }),
                S.Struct({ subdomain_id: S.String }),
            ])
        )(command.args)
        if (Option.isNone(args))
            return [
                {
                    ...model,
                    ui: {
                        ...ui_only(ui),
                        busy: false,
                        error: Option.some("Check the subdomain fields."),
                    },
                },
                [],
            ]
        const action = S.decodeUnknownOption(SubdomainAction)({
            ...args.value,
            _tag:
                command.name === "CreateSubdomain"
                    ? "create"
                    : command.name === "UpdateSubdomain"
                      ? "update"
                      : "delete",
            id: args.value.subdomain_id ?? crypto.randomUUID(),
        })
        if (Option.isNone(action))
            return [
                {
                    ...model,
                    ui: {
                        ...ui_only(ui),
                        busy: false,
                        error: Option.some("Check the subdomain fields."),
                    },
                },
                [],
            ]
        return [
            { ...model, ui: ui_only(ui), pending: true },
            [LoadSubdomainCatalog({ ...scope(model), action: action.value })],
        ]
    }
    const [ui, commands] = Domains.update(
        project(model),
        message,
        domains.map(({ id, name, slug }) => ({
            id,
            name,
            slug,
            updated_at: 0,
        })),
        active_domain_id
    )
    return [
        { ...model, ui: ui_only(ui) },
        commands.flatMap((command) =>
            domain_command(command, model.epoch, model.account_id)
        ),
    ]
}
export interface ViewInputs {
    readonly domains: ReadonlyArray<AccountDomain>
    readonly active_domain_id: Option.Option<string>
}
export const view = Submodel.defineView<Model, Message, ViewInputs>(
    (model, inputs, h) =>
        h.div(
            [],
            [
                h.button(
                    [
                        h.Type("button"),
                        h.Disabled(model.pending),
                        h.OnClick(Refreshed()),
                    ],
                    [
                        Option.isSome(model.ui.error)
                            ? "Retry subdomains"
                            : "Refresh subdomains",
                    ]
                ),
                h.submodel({
                    slotId: "domains-ui",
                    model: project(model),
                    view: Domains.view,
                    viewInputs: {
                        domains: inputs.domains.map((domain) => ({
                            id: domain.id,
                            name: domain.name,
                            slug: domain.slug,
                            updated_at: 0,
                        })),
                        active_domain_id: inputs.active_domain_id,
                        pages_subdomain_href: pagesSubdomainHref,
                        can_manage_subdomains:
                            model.can_write && !model.pending,
                    },
                    toParentMessage: (message) => message,
                }),
            ]
        )
)
