import {
    Array,
    Effect,
    Match as M,
    Option,
    String,
    pipe,
    Schema as S,
} from "effect"
import { Command } from "foldkit"
import * as Ui from "@foldkit/ui"
import type { Url } from "foldkit/url"
import type { Model } from "./app.model.ts"
import { isCompactViewport } from "./app.subscription.ts"
import type { AppMessage } from "./app.message.ts"
import {
    GotDeleteIssueDialogMessage,
    GotDragAndDropMessage,
    IssueCreateFailed,
    IssueCreated,
    IssueDeleteFailed,
    IssueDeleted,
    IssueLoadFailed,
    IssueUpdateFailed,
    IssueUpdated,
    IssuesLoaded,
} from "./app.message.ts"
import { issuesHref, isAppScope, urlToAppRoute } from "./route.ts"
import {
    loadExternal,
    navigateInternal,
    navigateToIssuesIndex,
} from "./route.command.ts"
import {
    IssuePriority,
    IssueStatus,
    UpdateIssueInput,
    type Issue,
} from "@urm/domain/schemas/issues"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<AppMessage>>]
type BoardStatus = Exclude<Issue["status"], "archived">

const withUpdateReturn = M.withReturnType<UpdateReturn>()
const NewIssue = S.Struct({
    title: S.String,
    description: S.optional(S.String),
    content: S.optional(S.String),
    status: IssueStatus,
    priority: S.optional(IssuePriority),
    labels: S.optional(S.String),
    assignee_id: S.optional(S.String),
    order_position: S.Number,
    updated_at: S.Number,
})

const CreateIssue = Command.define("CreateIssue", {
    args: { issue: NewIssue },
    messages: [IssueCreated, IssueCreateFailed],
    execute: () =>
        Effect.succeed(
            IssueCreateFailed({
                error: "No issues persistence adapter installed",
            })
        ),
})
// UpdateIssueInput minus the id the wrapper passes separately. Deriving it
// keeps the optionality exactly as the rpc expects rather than restating it.
const { id: _issuePatchId, ...issuePatchFields } = UpdateIssueInput.fields
const IssuePatch = S.Struct(issuePatchFields)

const UpdateIssue = Command.define("UpdateIssue", {
    args: { id: S.String, issue: IssuePatch },
    messages: [IssueUpdated, IssueUpdateFailed],
    execute: () =>
        Effect.succeed(
            IssueUpdateFailed({
                error: "No issues persistence adapter installed",
            })
        ),
})
const DeleteIssue = Command.define("DeleteIssue", {
    args: { id: S.String, title: S.String },
    messages: [IssueDeleted, IssueDeleteFailed],
    execute: () =>
        Effect.succeed(
            IssueDeleteFailed({
                error: "No issues persistence adapter installed",
            })
        ),
})

const labelsTextToJson = (value: string): string | undefined => {
    try {
        const parsed: unknown = globalThis.JSON.parse(value)
        if (
            globalThis.Array.isArray(parsed) &&
            parsed.every((item) => typeof item === "string")
        ) {
            return parsed.length === 0
                ? undefined
                : globalThis.JSON.stringify(parsed)
        }
    } catch {
        // Plain comma-separated labels remain supported by the web adapter.
    }

    const labels = value
        .split(",")
        .map((label) => String.trim(label))
        .filter((label) => !String.isEmpty(label))

    return labels.length === 0 ? undefined : globalThis.JSON.stringify(labels)
}

const boardStatuses: ReadonlyArray<BoardStatus> = [
    "open",
    "in_progress",
    "on_hold",
    "closed",
]

const STATUS_LABELS: Record<BoardStatus, string> = {
    open: "Open",
    in_progress: "In Progress",
    on_hold: "On Hold",
    closed: "Closed",
}

const nextBoardStatus = (status: BoardStatus): BoardStatus =>
    status === "open"
        ? "in_progress"
        : status === "in_progress"
          ? "on_hold"
          : status === "on_hold"
            ? "closed"
            : "open"

const isBoardStatus = (
    value: string
): value is (typeof boardStatuses)[number] =>
    value === "open" ||
    value === "in_progress" ||
    value === "on_hold" ||
    value === "closed"

const issueOrFirst = (
    issues: ReadonlyArray<Model["issues"][number]>,
    issueId: string
) =>
    pipe(
        issues,
        Array.findFirst((issue) => issue.id === issueId)
    )

const initialEditorState = (
    model: Model,
    issueId: string
): Pick<
    Model,
    | "editingTitle"
    | "editingDescription"
    | "editingLabels"
    | "editingStatus"
    | "editingPriority"
    | "editingAssignee"
> => {
    return pipe(
        issueOrFirst(model.issues, issueId),
        Option.match({
            onNone: () => ({
                editingTitle: "",
                editingDescription: "",
                editingContent: "",
                editingLabels: "",
                editingStatus: "open",
                editingPriority: "medium",
                editingAssignee: "",
            }),
            onSome: (issue) => ({
                editingTitle: issue.title,
                editingDescription: issue.description ?? "",
                editingContent: issue.content ?? "",
                editingLabels: issue.labels ?? "",
                editingStatus: issue.status,
                editingPriority: issue.priority ?? "medium",
                editingAssignee: issue.assignee_id ?? "",
            }),
        })
    )
}

const isIssueRoute = (
    route: Model["route"]
): route is Extract<Model["route"], { _tag: "Issue" }> => route._tag === "Issue"

const getIssueId = (route: Model["route"]): string | undefined =>
    route._tag === "Issue" ? route.issueId : undefined

const buildInitialModel = (pathname: string): Model => {
    const route = urlToAppRoute(pathname)

    const baseModel: Model = {
        route,
        issues: [],
        availableTags: [],
        usesTagRelations: false,
        issuesLoaded: false,
        dragAndDrop: Ui.DragAndDrop.init({ id: "issues" }),
        announcement: "",
        view: "board",
        isCompactViewport: isCompactViewport(),
        searchQuery: "",
        statusFilter: "all",
        priorityFilter: "all",
        newTitle: "",
        newDescription: "",
        newContent: "",
        newLabels: "",
        newAssignee: "",
        newStatus: "open",
        newPriority: "medium",
        create_issue_expanded: false,
        create_issue_details_expanded: false,
        issue_detail_mode: "preview",
        editingTitle: "",
        editingDescription: "",
        editingContent: "",
        editingLabels: "",
        editingStatus: "open",
        editingPriority: "medium",
        editingAssignee: "",
        pending_delete_issue_id: Option.none(),
        delete_issue_dialog: Ui.Dialog.init({ id: "delete-issue" }),
    }

    if (isIssueRoute(route)) {
        return {
            ...baseModel,
            ...initialEditorState(baseModel, route.issueId),
        }
    }

    return baseModel
}

const boardColumns = (
    issues: ReadonlyArray<Model["issues"][number]>
): Record<BoardStatus, ReadonlyArray<Model["issues"][number]>> => ({
    open: issues
        .filter((issue) => issue.status === "open")
        .slice()
        .sort((a, b) => a.order_position - b.order_position),
    in_progress: issues
        .filter((issue) => issue.status === "in_progress")
        .slice()
        .sort((a, b) => a.order_position - b.order_position),
    on_hold: issues
        .filter((issue) => issue.status === "on_hold")
        .slice()
        .sort((a, b) => a.order_position - b.order_position),
    closed: issues
        .filter((issue) => issue.status === "closed")
        .slice()
        .sort((a, b) => a.order_position - b.order_position),
})

const renumberBoardIssues = (
    issues: ReadonlyArray<Model["issues"][number]>
) => {
    const columns = boardColumns(issues)
    const nextById = new Map<string, Model["issues"][number]>()

    boardStatuses.forEach((status) => {
        columns[status].forEach((issue, index) => {
            nextById.set(issue.id, {
                ...issue,
                status,
                order_position: index + 1,
            })
        })
    })

    return Array.map(issues, (issue) => nextById.get(issue.id) ?? issue)
}

const moveIssue = (
    issues: ReadonlyArray<Model["issues"][number]>,
    itemId: string,
    fromStatus: string,
    toStatus: string,
    toIndex: number
) => {
    if (!isBoardStatus(fromStatus) || !isBoardStatus(toStatus)) {
        return issues
    }

    const movingIssue = issues.find((issue) => issue.id === itemId)
    if (movingIssue == null) {
        return issues
    }

    const columns = boardColumns(issues)
    const fromList = columns[fromStatus].filter((issue) => issue.id !== itemId)
    const targetBase = fromStatus === toStatus ? fromList : columns[toStatus]
    const nextTarget = [...targetBase]
    nextTarget.splice(Math.max(0, Math.min(toIndex, nextTarget.length)), 0, {
        ...movingIssue,
        status: toStatus,
    })

    const nextColumns: Record<
        BoardStatus,
        ReadonlyArray<Model["issues"][number]>
    > = {
        ...columns,
        [fromStatus]: fromStatus === toStatus ? nextTarget : fromList,
        [toStatus]: nextTarget,
    }

    const nextById = new Map<string, Model["issues"][number]>()

    boardStatuses.forEach((status) => {
        nextColumns[status].forEach((issue, index) => {
            nextById.set(issue.id, {
                ...issue,
                status,
                order_position: index + 1,
            })
        })
    })

    return Array.map(issues, (issue) => nextById.get(issue.id) ?? issue)
}

const announcementForDrop = (
    issues: ReadonlyArray<Model["issues"][number]>,
    itemId: string,
    toContainerId: string,
    toIndex: number
) =>
    `Moved ${pipe(
        issues,
        Array.findFirst((issue) => issue.id === itemId),
        Option.match({
            onNone: () => itemId,
            onSome: ({ title }) => title,
        })
    )} to ${toContainerId.replace("_", " ")} position ${toIndex + 1}.`

const normalizeIssue = (issue: Issue): Issue => ({
    id: issue.id,
    title: issue.title,
    ...(issue.description == null ? {} : { description: issue.description }),
    ...(issue.content == null ? {} : { content: issue.content }),
    status: issue.status,
    ...(issue.priority == null ? {} : { priority: issue.priority }),
    ...(issue.labels == null ? {} : { labels: issue.labels }),
    ...(issue.assignee_id == null ? {} : { assignee_id: issue.assignee_id }),
    order_position: issue.order_position,
    updated_at: issue.updated_at,
    ...(issue.deleted_at == null ? {} : { deleted_at: issue.deleted_at }),
})

const mergeIssues = (
    localIssues: ReadonlyArray<Model["issues"][number]>,
    loadedIssues: ReadonlyArray<Model["issues"][number]>
) => {
    const nextById = new Map<string, Model["issues"][number]>()

    localIssues.forEach((issue) => {
        nextById.set(issue.id, normalizeIssue(issue))
    })

    loadedIssues.forEach((issue) => {
        nextById.set(issue.id, normalizeIssue(issue))
    })

    return renumberBoardIssues(globalThis.Array.from(nextById.values()))
}
const LoadIssues = Command.define("LoadIssues", {
    messages: [IssuesLoaded, IssueLoadFailed],
    execute: Effect.succeed(
        IssueLoadFailed({ error: "No issues persistence adapter installed" })
    ),
})

const loadIssues = () => LoadIssues()

const createIssue = (issue: typeof NewIssue.Type) => CreateIssue({ issue })

const updateIssue = (id: string, issue: typeof IssuePatch.Type) =>
    UpdateIssue({ id, issue })

const deleteIssue = (id: string, title: string) => DeleteIssue({ id, title })

export const init = (url: Url): UpdateReturn => {
    const model = buildInitialModel(url.pathname)

    return isAppScope(url.pathname) ? [model, [loadIssues()]] : [model, []]
}

export const update = (model: Model, message: AppMessage): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            IssuesLoaded: ({ issues, tags }) => {
                const normalizedIssues = issues.map(normalizeIssue)
                const nextIssues = model.issuesLoaded
                    ? mergeIssues(model.issues, normalizedIssues)
                    : normalizedIssues
                const nextModel = {
                    ...model,
                    issues: nextIssues,
                    availableTags: tags ?? model.availableTags,
                    usesTagRelations:
                        tags === undefined ? model.usesTagRelations : true,
                    issuesLoaded: true,
                }

                if (
                    !isIssueRoute(model.route) ||
                    model.issue_detail_mode === "editing"
                ) {
                    return [nextModel, []]
                }

                return [
                    {
                        ...nextModel,
                        ...initialEditorState(nextModel, model.route.issueId),
                    },
                    [],
                ]
            },

            IssueLoadFailed: ({ error }) => [
                {
                    ...model,
                    announcement: `Failed to load issues: ${error}`,
                },
                [],
            ],

            ChangedUrl: ({ url }) => {
                const route = urlToAppRoute(url.pathname)
                const nextModel: Model = {
                    ...model,
                    route,
                    issue_detail_mode: "preview",
                }
                const commands =
                    isAppScope(url.pathname) && !model.issuesLoaded
                        ? [loadIssues()]
                        : []

                return isIssueRoute(route)
                    ? [
                          {
                              ...nextModel,
                              ...initialEditorState(nextModel, route.issueId),
                          },
                          commands,
                      ]
                    : [nextModel, commands]
            },

            ClickedLink: ({ request }) =>
                M.value(request).pipe(
                    withUpdateReturn,
                    M.tagsExhaustive({
                        Internal: ({ url }) => {
                            if (isAppScope(url.pathname)) {
                                return [model, [navigateInternal(url)]]
                            }

                            return [model, [loadExternal(url.pathname)]]
                        },
                        External: ({ href }) => [model, [loadExternal(href)]],
                    })
                ),

            CompletedNavigateInternal: () => [model, []],

            GotDragAndDropMessage: ({ message: dragMessage }) => {
                const {
                    model: nextDragAndDrop,
                    commands: dragCommands = [],
                    outMessage: maybeOutMessage_value,
                } = Ui.DragAndDrop.update(model.dragAndDrop, dragMessage)
                const maybeOutMessage = Option.fromUndefinedOr(
                    maybeOutMessage_value
                )

                const mappedCommands = dragCommands.map(
                    Command.mapEffect(
                        Effect.map((innerMessage) =>
                            GotDragAndDropMessage({ message: innerMessage })
                        )
                    )
                )

                return Option.match(maybeOutMessage, {
                    onNone: () => [
                        { ...model, dragAndDrop: nextDragAndDrop },
                        mappedCommands,
                    ],
                    onSome: (outMessage) =>
                        M.value(outMessage).pipe(
                            withUpdateReturn,
                            M.tagsExhaustive({
                                Reordered: ({
                                    itemId,
                                    fromContainerId,
                                    toContainerId,
                                    toIndex,
                                }) => {
                                    const nextIssues = moveIssue(
                                        model.issues,
                                        itemId,
                                        fromContainerId,
                                        toContainerId,
                                        toIndex
                                    )
                                    const updatedAt = Date.now()

                                    const persistedIssues = nextIssues.map(
                                        (issue) => {
                                            const currentIssue =
                                                model.issues.find(
                                                    (current) =>
                                                        current.id === issue.id
                                                )

                                            if (
                                                currentIssue == null ||
                                                currentIssue.status !==
                                                    issue.status ||
                                                currentIssue.order_position !==
                                                    issue.order_position
                                            ) {
                                                return {
                                                    ...issue,
                                                    updated_at: updatedAt,
                                                }
                                            }

                                            return issue
                                        }
                                    )

                                    const persistCommands =
                                        persistedIssues.flatMap((issue) => {
                                            const currentIssue =
                                                model.issues.find(
                                                    (current) =>
                                                        current.id === issue.id
                                                )

                                            if (
                                                currentIssue == null ||
                                                currentIssue.status !==
                                                    issue.status ||
                                                currentIssue.order_position !==
                                                    issue.order_position
                                            ) {
                                                return [
                                                    updateIssue(issue.id, {
                                                        status: issue.status,
                                                        order_position:
                                                            issue.order_position,
                                                        updated_at:
                                                            issue.updated_at,
                                                    }),
                                                ]
                                            }

                                            return []
                                        })

                                    return [
                                        {
                                            ...model,
                                            issues: persistedIssues,
                                            dragAndDrop: nextDragAndDrop,
                                            announcement: announcementForDrop(
                                                persistedIssues,
                                                itemId,
                                                toContainerId,
                                                toIndex
                                            ),
                                        },
                                        [...mappedCommands, ...persistCommands],
                                    ]
                                },
                                Cancelled: () => [
                                    {
                                        ...model,
                                        dragAndDrop: nextDragAndDrop,
                                        announcement: "Drag cancelled.",
                                    },
                                    mappedCommands,
                                ],
                            })
                        ),
                })
            },

            MoveIssueForward: ({ issueId }) => {
                const movingIssue = model.issues.find(
                    (issue) => issue.id === issueId
                )
                if (movingIssue == null || !isBoardStatus(movingIssue.status)) {
                    return [model, []]
                }

                const destination = nextBoardStatus(movingIssue.status)
                const destinationIndex = boardColumns(model.issues)[destination]
                    .length
                const movedIssues = moveIssue(
                    model.issues,
                    issueId,
                    movingIssue.status,
                    destination,
                    destinationIndex
                )
                const updatedAt = Date.now()
                const persistedIssues = movedIssues.map((issue) => {
                    const currentIssue = model.issues.find(
                        (current) => current.id === issue.id
                    )
                    return currentIssue != null &&
                        (currentIssue.status !== issue.status ||
                            currentIssue.order_position !==
                                issue.order_position)
                        ? { ...issue, updated_at: updatedAt }
                        : issue
                })
                const commands = persistedIssues.flatMap((issue) => {
                    const currentIssue = model.issues.find(
                        (current) => current.id === issue.id
                    )
                    return currentIssue != null &&
                        (currentIssue.status !== issue.status ||
                            currentIssue.order_position !==
                                issue.order_position)
                        ? [
                              updateIssue(issue.id, {
                                  status: issue.status,
                                  order_position: issue.order_position,
                                  updated_at: issue.updated_at,
                              }),
                          ]
                        : []
                })

                return [
                    {
                        ...model,
                        issues: persistedIssues,
                        announcement: `Moved ${movingIssue.title} to ${STATUS_LABELS[destination]}.`,
                    },
                    commands,
                ]
            },

            ViewSelected: ({ view }) => [{ ...model, view }, []],
            // The board is unusable below `xl`, so a compact viewport
            // pins the list. The chosen view is kept so widening the
            // window restores it.
            ViewportChanged: ({ isCompact }) => [
                { ...model, isCompactViewport: isCompact },
                [],
            ],
            SearchQueryChanged: ({ value }) => [
                { ...model, searchQuery: value },
                [],
            ],
            StatusFilterChanged: ({ value }) => [
                { ...model, statusFilter: value },
                [],
            ],
            PriorityFilterChanged: ({ value }) => [
                { ...model, priorityFilter: value },
                [],
            ],
            NewTitleChanged: ({ value }) => [{ ...model, newTitle: value }, []],
            NewDescriptionChanged: ({ value }) => [
                { ...model, newDescription: value },
                [],
            ],
            NewContentChanged: ({ value }) => [
                { ...model, newContent: value },
                [],
            ],
            NewLabelsChanged: ({ value }) => [
                { ...model, newLabels: value },
                [],
            ],
            NewAssigneeChanged: ({ value }) => [
                { ...model, newAssignee: value },
                [],
            ],
            NewStatusChanged: ({ value }) => [
                { ...model, newStatus: value },
                [],
            ],
            NewPriorityChanged: ({ value }) => [
                { ...model, newPriority: value },
                [],
            ],
            ToggledCreateIssue: () => [
                {
                    ...model,
                    create_issue_expanded: !model.create_issue_expanded,
                    create_issue_details_expanded: model.create_issue_expanded
                        ? false
                        : model.create_issue_details_expanded,
                    newTitle: model.create_issue_expanded ? "" : model.newTitle,
                    newDescription: model.create_issue_expanded
                        ? ""
                        : model.newDescription,
                    newContent: model.create_issue_expanded
                        ? ""
                        : model.newContent,
                    newLabels: model.create_issue_expanded
                        ? ""
                        : model.newLabels,
                    newAssignee: model.create_issue_expanded
                        ? ""
                        : model.newAssignee,
                    newStatus: model.create_issue_expanded
                        ? "open"
                        : model.newStatus,
                    newPriority: model.create_issue_expanded
                        ? "medium"
                        : model.newPriority,
                },
                [],
            ],
            ToggledCreateIssueDetails: () => [
                {
                    ...model,
                    create_issue_details_expanded:
                        !model.create_issue_details_expanded,
                },
                [],
            ],
            StartedIssueEditing: () => {
                if (!isIssueRoute(model.route)) {
                    return [model, []]
                }

                return [
                    {
                        ...model,
                        ...initialEditorState(model, model.route.issueId),
                        issue_detail_mode: "editing",
                    },
                    [],
                ]
            },
            CancelledIssueEditing: () => {
                if (!isIssueRoute(model.route)) {
                    return [model, []]
                }

                return [
                    {
                        ...model,
                        ...initialEditorState(model, model.route.issueId),
                        issue_detail_mode: "preview",
                    },
                    [],
                ]
            },
            EditingTitleChanged: ({ value }) => [
                { ...model, editingTitle: value },
                [],
            ],
            EditingDescriptionChanged: ({ value }) => [
                { ...model, editingDescription: value },
                [],
            ],
            EditingContentChanged: ({ value }) => [
                { ...model, editingContent: value },
                [],
            ],
            EditingLabelsChanged: ({ value }) => [
                { ...model, editingLabels: value },
                [],
            ],
            EditingStatusChanged: ({ value }) => [
                { ...model, editingStatus: value },
                [],
            ],
            EditingPriorityChanged: ({ value }) => [
                { ...model, editingPriority: value },
                [],
            ],
            EditingAssigneeChanged: ({ value }) => [
                { ...model, editingAssignee: value },
                [],
            ],

            CreatedIssueSubmitted: () => {
                const title = String.trim(model.newTitle)
                if (String.isEmpty(title)) {
                    return [model, []]
                }

                const description = String.trim(model.newDescription)
                const content = String.trim(model.newContent)
                const labels = labelsTextToJson(model.newLabels)
                const assignee_id = String.trim(model.newAssignee)

                const nextIssue = {
                    title,
                    ...(String.isEmpty(description) ? {} : { description }),
                    ...(String.isEmpty(content) ? {} : { content }),
                    status: model.newStatus,
                    priority: model.newPriority,
                    ...(labels === undefined ? {} : { labels }),
                    ...(String.isEmpty(assignee_id) ? {} : { assignee_id }),
                    order_position:
                        model.issues.filter(
                            (issue) => issue.status === model.newStatus
                        ).length + 1,
                    updated_at: Date.now(),
                }

                return [model, [createIssue(nextIssue)]]
            },

            SavedIssueSubmitted: () => {
                if (!isIssueRoute(model.route)) {
                    return [model, []]
                }

                const currentIssueId = getIssueId(model.route)
                const currentIssue =
                    currentIssueId == null
                        ? undefined
                        : model.issues.find(
                              (issue) => issue.id === currentIssueId
                          )
                if (currentIssue == null) {
                    return [model, []]
                }

                return [
                    model,
                    [
                        updateIssue(currentIssue.id, {
                            title:
                                String.trim(model.editingTitle) ||
                                currentIssue.title,
                            description:
                                String.trim(model.editingDescription) ||
                                undefined,
                            content:
                                String.trim(model.editingContent) || undefined,
                            labels: labelsTextToJson(model.editingLabels),
                            status: model.editingStatus,
                            priority: model.editingPriority,
                            assignee_id:
                                String.trim(model.editingAssignee) || undefined,
                            updated_at: Date.now(),
                        }),
                    ],
                ]
            },

            RequestedIssueDelete: ({ issueId }) => {
                if (!model.issues.some((issue) => issue.id === issueId)) {
                    return [model, []]
                }

                const { model: delete_issue_dialog, commands = [] } =
                    Ui.Dialog.update(
                        model.delete_issue_dialog,
                        Ui.Dialog.Message.RequestedOpen()
                    )

                return [
                    {
                        ...model,
                        pending_delete_issue_id: Option.some(issueId),
                        delete_issue_dialog,
                    },
                    commands.map(
                        Command.mapEffect(
                            Effect.map((message) =>
                                GotDeleteIssueDialogMessage({ message })
                            )
                        )
                    ),
                ]
            },

            GotDeleteIssueDialogMessage: ({ message }) => {
                const { model: delete_issue_dialog, commands = [] } =
                    Ui.Dialog.update(model.delete_issue_dialog, message)

                return [
                    { ...model, delete_issue_dialog },
                    commands.map(
                        Command.mapEffect(
                            Effect.map((next_message) =>
                                GotDeleteIssueDialogMessage({
                                    message: next_message,
                                })
                            )
                        )
                    ),
                ]
            },

            ConfirmedIssueDelete: () =>
                Option.match(model.pending_delete_issue_id, {
                    onNone: () => [model, []],
                    onSome: (issue_id) => {
                        const issue = model.issues.find(
                            (candidate) => candidate.id === issue_id
                        )
                        const { model: delete_issue_dialog, commands = [] } =
                            Ui.Dialog.update(
                                model.delete_issue_dialog,
                                Ui.Dialog.Message.RequestedClose()
                            )

                        return [
                            {
                                ...model,
                                pending_delete_issue_id: Option.none(),
                                delete_issue_dialog,
                            },
                            [
                                ...commands.map(
                                    Command.mapEffect(
                                        Effect.map((message) =>
                                            GotDeleteIssueDialogMessage({
                                                message,
                                            })
                                        )
                                    )
                                ),
                                ...(issue === undefined
                                    ? []
                                    : [deleteIssue(issue.id, issue.title)]),
                            ],
                        ]
                    },
                }),

            IssueCreated: ({ issue }) => {
                const nextIssues = renumberBoardIssues([
                    ...model.issues.filter(
                        (current_issue) => current_issue.id !== issue.id
                    ),
                    normalizeIssue(issue),
                ])

                return [
                    {
                        ...model,
                        issues: nextIssues,
                        issuesLoaded: true,
                        newTitle: "",
                        newDescription: "",
                        newContent: "",
                        newLabels: "",
                        newAssignee: "",
                        newStatus: "open",
                        newPriority: "medium",
                        create_issue_expanded: false,
                        create_issue_details_expanded: false,
                        announcement: `Created ${issue.title}.`,
                    },
                    [],
                ]
            },

            IssueCreateFailed: ({ error }) => [
                {
                    ...model,
                    announcement: `Failed to create issue: ${error}`,
                },
                [],
            ],

            IssueUpdated: ({ issue }) => {
                const nextIssues = renumberBoardIssues(
                    model.issues.map((currentIssue) =>
                        currentIssue.id === issue.id
                            ? normalizeIssue(issue)
                            : currentIssue
                    )
                )

                const nextModel: Model = {
                    ...model,
                    issues: nextIssues,
                    issuesLoaded: true,
                    announcement: model.announcement.startsWith("Moved ")
                        ? model.announcement
                        : `Saved ${issue.title}.`,
                }

                if (
                    !isIssueRoute(model.route) ||
                    model.route.issueId !== issue.id
                ) {
                    return [nextModel, []]
                }

                return [
                    {
                        ...nextModel,
                        ...initialEditorState(nextModel, issue.id),
                        issue_detail_mode: "preview",
                    },
                    [],
                ]
            },

            IssueUpdateFailed: ({ error }) => [
                {
                    ...model,
                    announcement: `Failed to save issue: ${error}`,
                },
                [],
            ],

            IssueDeleted: ({ issueId, title }) => {
                const nextIssues = renumberBoardIssues(
                    model.issues.filter((issue) => issue.id !== issueId)
                )
                const deleted_open_issue =
                    isIssueRoute(model.route) && model.route.issueId === issueId

                return [
                    {
                        ...model,
                        issues: nextIssues,
                        issuesLoaded: true,
                        route: deleted_open_issue
                            ? urlToAppRoute(issuesHref())
                            : model.route,
                        pending_delete_issue_id: Option.none(),
                        announcement: `Deleted ${title}.`,
                    },
                    deleted_open_issue ? [navigateToIssuesIndex()] : [],
                ]
            },

            IssueDeleteFailed: ({ error }) => [
                {
                    ...model,
                    announcement: `Failed to delete issue: ${error}`,
                },
                [],
            ],
        })
    )
