/**
 * # Issues RPC Handlers
 *
 * Effect RPC handlers for issues and issue labels operations.
 * Uses repositories for database operations.
 */

import { Context, type Schema } from "effect"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { IssuesRpcs, IssueLabelsRpcs } from "@urm/contracts/issues"
import {
    IssuesRepository,
    IssueLabelsRepository,
} from "@urm/contracts/repositories/issues"
import { ActiveDomainRequestContext } from "@urm/contracts/auth-legacy"
import {
    CreateIssueInput,
    CreateIssueLabelInput,
    Issue,
    IssueLabel,
    DatabaseError,
    NotFoundError,
    UpdateIssueInput,
    UpdateIssueLabelInput,
} from "@urm/domain/schemas/issues"

export type IssueType = Issue
export type IssueLabelType = IssueLabel

export type IssuesRpcHandlers = {
    "issues.list": () => Effect.Effect<
        IssueType[],
        DatabaseError,
        ActiveDomainRequestContext
    >
    "issues.get": (params: {
        id: string
    }) => Effect.Effect<
        IssueType,
        NotFoundError | DatabaseError,
        ActiveDomainRequestContext
    >
    "issues.create": (params: {
        data: Schema.Schema.Type<typeof CreateIssueInput>
    }) => Effect.Effect<
        { item: IssueType; txid: number },
        DatabaseError | Error,
        ActiveDomainRequestContext
    >
    "issues.update": (params: {
        id: string
        data: Schema.Schema.Type<typeof UpdateIssueInput>
    }) => Effect.Effect<
        { item: IssueType; txid: number },
        NotFoundError | DatabaseError | Error,
        ActiveDomainRequestContext
    >
    "issues.delete": (params: {
        id: string
    }) => Effect.Effect<
        { txid: number },
        NotFoundError | DatabaseError,
        ActiveDomainRequestContext
    >
}

export type IssueLabelsRpcHandlers = {
    "issueLabels.list": () => Effect.Effect<
        IssueLabelType[],
        DatabaseError,
        ActiveDomainRequestContext
    >
    "issueLabels.get": (params: {
        id: string
    }) => Effect.Effect<
        IssueLabelType,
        NotFoundError | DatabaseError,
        ActiveDomainRequestContext
    >
    "issueLabels.create": (params: {
        data: Schema.Schema.Type<typeof CreateIssueLabelInput>
    }) => Effect.Effect<
        { item: IssueLabelType; txid: number },
        DatabaseError | Error,
        ActiveDomainRequestContext
    >
    "issueLabels.update": (params: {
        id: string
        data: Schema.Schema.Type<typeof UpdateIssueLabelInput>
    }) => Effect.Effect<
        { item: IssueLabelType; txid: number },
        NotFoundError | DatabaseError | Error,
        ActiveDomainRequestContext
    >
    "issueLabels.delete": (params: {
        id: string
    }) => Effect.Effect<
        { txid: number },
        NotFoundError | DatabaseError,
        ActiveDomainRequestContext
    >
}

export class IssuesRpcHandlersTag extends Context.Service<
    IssuesRpcHandlersTag,
    IssuesRpcHandlers
>()("IssuesRpcHandlers") {}

export class IssueLabelsRpcHandlersTag extends Context.Service<
    IssueLabelsRpcHandlersTag,
    IssueLabelsRpcHandlers
>()("IssueLabelsRpcHandlers") {}

const IssuesRpcHandlersLive = Effect.gen(function* () {
    const repo = yield* IssuesRepository

    return IssuesRpcs.of({
        // List all issues
        "issues.list": () =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* repo
                    .findMany(activeDomain.domainId, { limit: 50 })
                    .pipe(
                        Effect.mapError(
                            () =>
                                new DatabaseError({
                                    message: "Failed to fetch issues",
                                })
                        )
                    )
            }),

        // Get issue by ID
        "issues.get": ({ id }: { id: string }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* repo.findById(activeDomain.domainId, id).pipe(
                    Effect.andThen((result) => {
                        if (!result) {
                            return Effect.fail(
                                new NotFoundError({
                                    message: `Issue with id ${id} not found`,
                                })
                            )
                        }
                        return Effect.succeed(result)
                    }),
                    Effect.mapError((err) => {
                        if (err instanceof NotFoundError) return err
                        return new DatabaseError({
                            message: "Failed to fetch issue",
                        })
                    })
                )
            }),

        // Create a new issue
        "issues.create": ({ data }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* repo.insert(activeDomain.domainId, data).pipe(
                    Effect.mapError(
                        () =>
                            new DatabaseError({
                                message: "Failed to create issue",
                            })
                    )
                )
            }),

        // Update an issue
        "issues.update": ({ id, data }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* repo.update(activeDomain.domainId, id, data).pipe(
                    Effect.mapError((err) => {
                        if (
                            err instanceof Error &&
                            err.message.includes("not found")
                        ) {
                            return new NotFoundError({
                                message: `Issue with id ${id} not found`,
                            })
                        }
                        return new DatabaseError({
                            message: "Failed to update issue",
                        })
                    })
                )
            }),

        // Delete an issue
        "issues.delete": ({ id }: { id: string }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* repo.delete(activeDomain.domainId, id).pipe(
                    Effect.andThen(() => Effect.succeed({ txid: 0 })),
                    Effect.mapError((err) => {
                        if (
                            err instanceof Error &&
                            err.message.includes("not found")
                        ) {
                            return new NotFoundError({
                                message: `Issue with id ${id} not found`,
                            })
                        }
                        return new DatabaseError({
                            message: "Failed to delete issue",
                        })
                    })
                )
            }),
    })
})

const IssueLabelsRpcHandlersLive = Effect.gen(function* () {
    const repo = yield* IssueLabelsRepository

    return IssueLabelsRpcs.of({
        // List all issue labels
        "issueLabels.list": () =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* repo
                    .findMany(activeDomain.domainId, { limit: 50 })
                    .pipe(
                        Effect.mapError(
                            () =>
                                new DatabaseError({
                                    message: "Failed to fetch issue labels",
                                })
                        )
                    )
            }),

        // Get issue label by ID
        "issueLabels.get": ({ id }: { id: string }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* repo.findById(activeDomain.domainId, id).pipe(
                    Effect.andThen((result) => {
                        if (!result) {
                            return Effect.fail(
                                new NotFoundError({
                                    message: `Issue label with id ${id} not found`,
                                })
                            )
                        }
                        return Effect.succeed(result)
                    }),
                    Effect.mapError((err) => {
                        if (err instanceof NotFoundError) return err
                        return new DatabaseError({
                            message: "Failed to fetch issue label",
                        })
                    })
                )
            }),

        // Create a new issue label
        "issueLabels.create": ({ data }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* repo.insert(activeDomain.domainId, data).pipe(
                    Effect.mapError(
                        () =>
                            new DatabaseError({
                                message: "Failed to create issue label",
                            })
                    )
                )
            }),

        // Update an issue label
        "issueLabels.update": ({ id, data }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* repo.update(activeDomain.domainId, id, data).pipe(
                    Effect.mapError((err) => {
                        if (
                            err instanceof Error &&
                            err.message.includes("not found")
                        ) {
                            return new NotFoundError({
                                message: `Issue label with id ${id} not found`,
                            })
                        }
                        return new DatabaseError({
                            message: "Failed to update issue label",
                        })
                    })
                )
            }),

        // Delete an issue label
        "issueLabels.delete": ({ id }: { id: string }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* repo.delete(activeDomain.domainId, id).pipe(
                    Effect.andThen(() => Effect.succeed({ txid: 0 })),
                    Effect.mapError((err) => {
                        if (
                            err instanceof Error &&
                            err.message.includes("not found")
                        ) {
                            return new NotFoundError({
                                message: `Issue label with id ${id} not found`,
                            })
                        }
                        return new DatabaseError({
                            message: "Failed to delete issue label",
                        })
                    })
                )
            }),
    })
})

export const IssuesRpcLive = IssuesRpcs.toLayer(IssuesRpcHandlersLive)
export const IssueLabelsRpcLive = IssueLabelsRpcs.toLayer(
    IssueLabelsRpcHandlersLive
)

export const IssuesRpcHandlersTagLive = Layer.effect(
    IssuesRpcHandlersTag,
    IssuesRpcHandlersLive
)
export const IssueLabelsRpcHandlersTagLive = Layer.effect(
    IssueLabelsRpcHandlersTag,
    IssueLabelsRpcHandlersLive
)
