import { Clock, Effect, Option, Schema as S, Struct } from "effect"
import { Command, Navigation, Submodel } from "foldkit"
import { fromString, type Url } from "foldkit/url"
import { defineMessageUnion } from "foldkit/message"
import { taggedStruct } from "foldkit/schema"
import { Remote, RemoteData, RemoteMutationError } from "foldkit-remote"
import { Surface } from "foldkit-surface"
import * as Issues from "@urm/features/issues/submodel"
import { IssueAction, IssueActions } from "@urm/domain/issues"
import {
    IssueCatalog,
    IssueSummary,
    DomainIssues,
    ChangeIssues,
} from "@urm/contracts/issues"
import { ContactsApi, AccountRequestError } from "../contacts/api.ts"
const ui_schema = S.Struct(
    Struct.omit(Issues.Model.fields, ["issues", "availableTags", "can_write"])
)
const ui_only = (model: Issues.ModelType) =>
    Struct.omit(model, ["issues", "availableTags", "can_write"])
export const Model = S.Struct({
    ui: ui_schema,
    remote: Remote.Model,
    account_id: S.String,
    domain_id: S.String,
    can_write: S.Boolean,
    epoch: S.Number,
    pending: S.Boolean,
    refresh_requested: S.Boolean,
})
export type Model = typeof Model.Type
const Loaded = taggedStruct("IssueCatalogLoaded", {
    epoch: S.Number,
    remote: Remote.Model,
    actions: S.optional(IssueActions),
})
const Saved = taggedStruct("IssueCatalogSaved", {
    ...Struct.omit(Loaded.fields, ["_tag", "remote"]),
    settlement: taggedStruct(
        "MutationSucceeded",
        Remote.messages.MutationSucceeded
    ),
})
const Failed = taggedStruct("IssueCatalogFailed", {
    epoch: S.Number,
    error: S.String,
})
export const Refreshed = taggedStruct("IssueCatalogRefreshed")
export const Message = S.Union([
    Issues.Message,
    Loaded,
    Saved,
    Failed,
    Refreshed,
])
export type Message = typeof Message.Type
export type UpdateReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<Message, never, ContactsApi>>,
]
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
    entities: [IssueCatalog],
    queries: [DomainIssues],
    mutations: [ChangeIssues],
})
const query = (domain_id: string) =>
    Data.query(DomainIssues, { domain_id }, { select: IssueSummary, first: 1 })
export const project = (model: Model): Issues.ModelType => {
    const result = query(model.domain_id).read({ remote: model.remote })
    const base = {
        ...model.ui,
        can_write: model.can_write && !model.pending,
        usesTagRelations: true,
    }
    const none = { issues: [], availableTags: [] } as const
    return RemoteData.render(result, {
        loading: (): Issues.ModelType => ({
            ...base,
            ...none,
            issuesLoaded: false,
            error: null,
        }),
        // `issuesLoaded` means an answer arrived, which these two did; `error`
        // is what distinguishes them from an empty board.
        notFound: (): Issues.ModelType => ({
            ...base,
            ...none,
            issuesLoaded: true,
            error: null,
        }),
        failed: (error): Issues.ModelType => ({
            ...base,
            ...none,
            issuesLoaded: true,
            error: error.message,
        }),
        data: (page, freshness): Issues.ModelType => {
            const catalog = page.items[0]
            return {
                ...base,
                issues: catalog?.issues ?? [],
                availableTags: catalog?.tags ?? [],
                issuesLoaded: true,
                error:
                    freshness._tag === "Stale" ? freshness.error.message : null,
            }
        },
    })
}
export const init = (url: Url, pathname = url.pathname): Model => ({
    ui: ui_only(Issues.init({ ...url, pathname })[0]),
    remote: Remote.initial,
    account_id: "",
    domain_id: "",
    can_write: false,
    epoch: 0,
    pending: false,
    refresh_requested: false,
})
export const clear = (model: Model): Model => ({
    ...model,
    ui: {
        ...ui_only(
            Issues.init(
                fromString("https://urm.test/issues").pipe(Option.getOrThrow)
            )[0]
        ),
        route: model.ui.route,
    },
    remote: Remote.initial,
    account_id: "",
    domain_id: "",
    can_write: false,
    epoch: model.epoch + 1,
    pending: false,
    refresh_requested: false,
})
const scope_fields = {
    account_id: S.String,
    domain_id: S.String,
    epoch: S.Number,
}
const scope = (model: Model) => ({
    account_id: model.account_id,
    domain_id: model.domain_id,
    epoch: model.epoch,
})
const LoadIssueCatalog = Command.define("LoadIssueCatalog", {
    args: { ...scope_fields, actions: S.optional(IssueActions) },
    messages: [Loaded, Saved, Failed],
    execute: ({ account_id, domain_id, epoch, actions }) =>
        Effect.gen(function* () {
            const api = yield* ContactsApi
            if (actions !== undefined) {
                const request_id = crypto.randomUUID()
                const outcome = yield* Remote.mutate(
                    ChangeIssues,
                    { domain_id, account_id, actions },
                    request_id
                ).pipe(Effect.provide(api.remote(domain_id)))
                return Saved({
                    epoch,
                    actions,
                    settlement: {
                        _tag: "MutationSucceeded",
                        requestId: request_id,
                        entities: outcome.entities,
                        connections: outcome.connections,
                        now: yield* Clock.currentTimeMillis,
                    },
                })
            }
            const session = yield* api.session()
            if (
                session.account_id !== account_id ||
                !session.domains.some(
                    (workspace) =>
                        workspace.id === domain_id &&
                        (actions === undefined || workspace.can_write)
                )
            )
                return yield* Effect.fail(
                    new AccountRequestError({
                        status: 403,
                        message: "Issue access changed. Sign in or refresh.",
                    })
                )
            const loaded = yield* Data.prefetch(
                { remote: Remote.initial },
                query(domain_id)
            ).pipe(Effect.provide(api.remote(domain_id)))
            if (query(domain_id).read(loaded)._tag !== "Ready")
                return yield* Effect.fail(
                    new AccountRequestError({
                        status: 403,
                        message:
                            "Issues could not be loaded. Check workspace access and refresh.",
                    })
                )
            return Loaded({
                epoch,
                remote: loaded.remote,
                ...(actions === undefined ? {} : { actions }),
            })
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(
                    Failed({
                        epoch,
                        error:
                            error instanceof AccountRequestError ||
                            error instanceof RemoteMutationError
                                ? error.message
                                : "Issue operation could not be confirmed. Refresh before retrying.",
                    })
                )
            )
        ),
})
const NavigateDesktopIssues = Command.define("NavigateDesktopIssues", {
    args: { href: S.String },
    messages: [Issues.CompletedNavigateInternal],
    execute: ({ href }) =>
        Navigation.pushUrl(href === "/issues/" ? "/issues" : href).pipe(
            Effect.as(Issues.CompletedNavigateInternal())
        ),
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
        return [model.domain_id === "" ? model : clear(model), []]
    if (
        model.account_id === account.account_id &&
        model.domain_id === account.domain_id &&
        model.can_write === account.can_write
    )
        return [model, []]
    const next = { ...clear(model), ...account, pending: true }
    return [next, [LoadIssueCatalog(scope(next))]]
}
const NewIssue = S.Struct({
    title: S.String,
    description: S.optional(S.String),
    content: S.optional(S.String),
    status: Issues.IssueStatus,
    priority: S.optional(Issues.IssuePriority),
    labels: S.optional(S.String),
    assignee_id: S.optional(S.String),
    order_position: S.Number,
    updated_at: S.Number,
})
const CreateIssueArgs = S.Struct({ issue: NewIssue })
const IssuePatch = S.Struct({
    title: S.optional(S.String),
    description: S.optional(S.String),
    content: S.optional(S.String),
    status: S.optional(Issues.IssueStatus),
    priority: S.optional(Issues.IssuePriority),
    labels: S.optional(S.String),
    assignee_id: S.optional(S.String),
    order_position: S.optional(S.Number),
    updated_at: S.Number,
})
const UpdateIssueArgs = S.Struct({
    id: S.String,
    issue: IssuePatch,
})
const DeleteIssueArgs = S.Struct({
    id: S.String,
    title: S.String,
})
const NavigateArgs = S.Struct({ href: S.String })

const label_references = (
    labels: string | undefined
): ReadonlyArray<string> => {
    if (labels === undefined || labels === "") {
        return []
    }

    try {
        const parsed: unknown = globalThis.JSON.parse(labels)

        if (globalThis.Array.isArray(parsed)) {
            return parsed.filter(
                (value): value is string => typeof value === "string"
            )
        }
    } catch {
        // Legacy web labels are comma-separated before command normalization.
    }

    return labels
        .split(",")
        .map((label) => label.trim())
        .filter((label) => label !== "")
}

const selected_tag_ids = (
    labels: string | undefined,
    tags: ReadonlyArray<Issues.Tag>
) => [
    ...new Set(
        label_references(labels).flatMap((reference) => {
            const tag = tags.find(
                (candidate) =>
                    candidate.id === reference ||
                    candidate.name.toLowerCase() === reference.toLowerCase()
            )
            return tag === undefined ? [reference] : [tag.id]
        })
    ),
]
const optional_text = (
    patch: typeof IssuePatch.Type,
    key: "description" | "content" | "assignee_id",
    current_value: string | undefined
): string | null =>
    Object.hasOwn(patch, key) ? (patch[key] ?? null) : (current_value ?? null)

const optional_priority = (
    patch: typeof IssuePatch.Type,
    current_value: Issues.Issue["priority"]
): typeof Issues.IssuePriority.Type | null =>
    Object.hasOwn(patch, "priority")
        ? (patch.priority ?? null)
        : (current_value ?? null)

const action_for = (
    model: Issues.ModelType,
    command: Command.Command<Issues.MessageType>
): Option.Option<IssueAction> => {
    if (command.name === "DeleteIssue" && S.is(DeleteIssueArgs)(command.args))
        return Option.some({ _tag: "delete", id: command.args.id })
    if (command.name === "CreateIssue" && S.is(CreateIssueArgs)(command.args)) {
        const issue = command.args.issue
        return S.decodeUnknownOption(IssueAction)({
            _tag: "create",
            id: crypto.randomUUID(),
            ...issue,
            description: issue.description ?? null,
            content: issue.content ?? null,
            priority: issue.priority ?? null,
            assignee_id: issue.assignee_id ?? null,
            tag_ids: selected_tag_ids(issue.labels, model.availableTags),
        })
    }
    if (command.name === "UpdateIssue" && S.is(UpdateIssueArgs)(command.args)) {
        const { id, issue: patch } = command.args
        const issue = model.issues.find((row) => row.id === id)
        if (!issue) return Option.none()
        return S.decodeUnknownOption(IssueAction)({
            _tag: "update",
            id,
            title: patch.title ?? issue.title,
            description: optional_text(patch, "description", issue.description),
            content: optional_text(patch, "content", issue.content),
            assignee_id: optional_text(patch, "assignee_id", issue.assignee_id),
            priority: optional_priority(patch, issue.priority),
            status: patch.status ?? issue.status,
            order_position: patch.order_position ?? issue.order_position,
            tag_ids: selected_tag_ids(
                Object.hasOwn(patch, "labels") ? patch.labels : issue.labels,
                model.availableTags
            ),
        })
    }
    return Option.none()
}
const apply = (model: Model, message: Issues.MessageType): UpdateReturn => {
    const projected = project(model)
    const [ui, commands] = Issues.update(projected, message)
    const actions: IssueAction[] = []
    const translated: Array<Command.Command<Message, never, ContactsApi>> = []
    let invalid = false
    for (const command of commands) {
        if (command.name === "LoadIssues") continue
        if (
            command.name === "NavigateInternal" &&
            S.is(NavigateArgs)(command.args)
        ) {
            translated.push(NavigateDesktopIssues(command.args))
            continue
        }
        if (
            ["CreateIssue", "UpdateIssue", "DeleteIssue"].includes(command.name)
        ) {
            const action = action_for(projected, command)
            if (Option.isSome(action)) actions.push(action.value)
            else invalid = true
        } else translated.push(command)
    }
    if (actions.length > 0 || invalid) {
        if (!model.can_write || model.pending) return [model, []]
        if (invalid)
            return [
                {
                    ...model,
                    ui: {
                        ...ui_only(ui),
                        announcement: "Check the issue fields before saving.",
                    },
                },
                [],
            ]
        translated.push(LoadIssueCatalog({ ...scope(model), actions }))
    }
    return [
        {
            ...model,
            ui: ui_only(ui),
            pending: model.pending || actions.length > 0,
        },
        translated,
    ]
}
const update_current = (
    model: Model,
    message: Message,
    _active_domain_id: Option.Option<string> = Option.none()
): UpdateReturn => {
    if ("epoch" in message && message.epoch !== model.epoch) return [model, []]
    if (message._tag === "IssueCatalogRefreshed") {
        if (model.pending) return [{ ...model, refresh_requested: true }, []]

        return model.pending || model.domain_id === ""
            ? [model, []]
            : [{ ...model, pending: true }, [LoadIssueCatalog(scope(model))]]
    }
    if (message._tag === "IssueCatalogFailed")
        return [
            {
                ...model,
                pending: false,
                ui: { ...model.ui, announcement: message.error },
            },
            [],
        ]
    if (
        message._tag === "IssueCatalogLoaded" ||
        message._tag === "IssueCatalogSaved"
    ) {
        let next = {
            ...model,
            remote:
                message._tag === "IssueCatalogSaved"
                    ? Data.reduce(model, message.settlement).remote
                    : message.remote,
            pending: false,
            ui: { ...model.ui, issuesLoaded: true, announcement: "" },
        }
        const commands: Array<Command.Command<Message, never, ContactsApi>> = []
        if (message.actions === undefined)
            return apply(
                next,
                Issues.IssuesLoaded({
                    issues: project(next).issues,
                    tags: project(next).availableTags,
                })
            )
        for (const action of message.actions) {
            const issue = project(next).issues.find(
                (row) => row.id === action.id
            )
            const feedback =
                action._tag === "delete"
                    ? Issues.IssueDeleted({
                          issueId: action.id,
                          title:
                              project(model).issues.find(
                                  (row) => row.id === action.id
                              )?.title ?? "issue",
                      })
                    : issue === undefined
                      ? undefined
                      : action._tag === "create"
                        ? Issues.IssueCreated({ issue })
                        : Issues.IssueUpdated({ issue })
            if (feedback) {
                const [updated, emitted] = apply(next, feedback)
                next = updated
                commands.push(...emitted)
            }
        }
        return [next, commands]
    }
    if (
        [
            "IssuesLoaded",
            "IssueCreated",
            "IssueUpdated",
            "IssueDeleted",
        ].includes(message._tag)
    )
        return [model, []]
    if (
        (!model.can_write || model.pending) &&
        message._tag === "GotDragAndDropMessage"
    )
        return [model, []]
    return apply(model, message)
}
export const update = (
    model: Model,
    message: Message,
    active_domain_id: Option.Option<string> = Option.none()
): UpdateReturn => {
    const [next, commands] = update_current(model, message, active_domain_id)
    if (!next.pending && next.refresh_requested && next.domain_id !== "")
        return [
            { ...next, pending: true, refresh_requested: false },
            [...commands, LoadIssueCatalog(scope(next))],
        ]
    return [next, commands]
}
export const changed_url = (
    model: Model,
    url: Url,
    pathname: string,
    active_domain_id: Option.Option<string>
): UpdateReturn =>
    update(
        model,
        Issues.ChangedUrl({ url: { ...url, pathname } }),
        active_domain_id
    )
export const compact_viewport_query = Issues.COMPACT_VIEWPORT_QUERY
export const got_drag_and_drop_message = Issues.GotDragAndDropMessage
export const viewport_changed = Issues.ViewportChanged
export const hrefs: Issues.IssueViewHrefs = {
    issues_href: () => "/issues",
    issue_href: (id) => `/issues/${encodeURIComponent(id)}`,
}
export const view = Submodel.defineView<Model, Message, Issues.IssueViewHrefs>(
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
                    ["Refresh issues"]
                ),
                ...(!model.can_write ? [h.p([], ["Read-only access"])] : []),
                h.div(
                    [],
                    [
                        h.submodel({
                            slotId: "issues-ui",
                            model: project(model),
                            view: Issues.routedSubmodelView,
                            viewInputs: inputs,
                            toParentMessage: (message) => message,
                        }),
                    ]
                ),
            ]
        )
)
