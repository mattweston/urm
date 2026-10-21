/**
 * # Issues Repository
 *
 * CRUD operations via Effect
 *
 * Feature-specific repository with full type safety for issues operations.
 * Validates input via Effect schemas and executes Drizzle queries.
 *
 * Provides two separate repositories:
 * - IssuesRepository: Manages issues table
 * - IssueLabelsRepository: Manages issue_labels table
 *
 * Uses drizzle-orm/effect-postgres which wraps all queries to return Effect instances.
 * When used with yield* in Effect.gen, results are automatically unwrapped.
 */

import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { and, desc, eq } from "drizzle-orm"
import { DB } from "@urm/db/layer"
import { issues, issue_labels } from "@urm/db/legacy-schema/issues"
import { members } from "@urm/db/legacy-schema/members"
import {
    Issue,
    IssueLabel,
    CreateIssueInput,
    UpdateIssueInput,
    CreateIssueLabelInput,
    UpdateIssueLabelInput,
} from "@urm/domain/schemas/issues"

import {
    IssuesRepository,
    IssueLabelsRepository,
    type IssuesRepositoryType,
    type IssueLabelsRepositoryType,
} from "@urm/contracts/repositories/issues"

import { repositoryError } from "../errors.ts"

const toDomainStatus = (status: string): Issue["status"] =>
    status === "backlog" || status === "open"
        ? "open"
        : status === "todo" || status === "on_hold"
          ? "on_hold"
          : status === "in_progress"
            ? "in_progress"
            : status === "done" || status === "closed"
              ? "closed"
              : "archived"

const toDbStatus = (
    status: Issue["status"]
): NonNullable<typeof issues.$inferInsert.status> =>
    status === "open"
        ? "backlog"
        : status === "on_hold"
          ? "todo"
          : status === "in_progress"
            ? "in_progress"
            : status === "closed"
              ? "done"
              : "cancelled"

const mapIssue = (issue: typeof issues.$inferSelect): Issue => ({
    id: issue.id,
    title: issue.title,
    ...(issue.description == null ? {} : { description: issue.description }),
    ...(issue.content == null ? {} : { content: issue.content }),
    status: toDomainStatus(issue.status),
    ...(issue.priority == null ? {} : { priority: issue.priority }),
    ...(issue.labels == null ? {} : { labels: issue.labels }),
    ...(issue.assignee_id == null ? {} : { assignee_id: issue.assignee_id }),
    order_position: issue.order_position,
    updated_at: issue.updated_at,
    ...(issue.deleted_at == null ? {} : { deleted_at: issue.deleted_at }),
})

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

const toIssueLabel = (label: typeof issue_labels.$inferSelect): IssueLabel => ({
    id: label.id,
    name: label.name,
    color: label.color,
    ...(label.description == null ? {} : { description: label.description }),
    updated_at: label.updated_at,
})

export const IssuesRepositoryLive = Layer.effect(
    IssuesRepository,
    Effect.gen(function* () {
        const db = yield* DB

        const ensureAssigneeBelongsToDomain = (
            domain_id: string,
            assignee_id: string | undefined
        ) => {
            if (assignee_id === undefined || assignee_id === "") {
                return Effect.void
            }

            return db
                .select({ id: members.id })
                .from(members)
                .where(
                    and(
                        eq(members.domain_id, domain_id),
                        eq(members.id, assignee_id)
                    )
                )
                .limit(1)
                .pipe(
                    Effect.mapError(repositoryError),
                    Effect.flatMap((member_rows) =>
                        member_rows[0] === undefined
                            ? Effect.fail(
                                  repositoryError(
                                      "Assignee not found in active domain"
                                  )
                              )
                            : Effect.void
                    )
                )
        }

        const repository: IssuesRepositoryType = {
            insert: (domain_id, data) =>
                Effect.gen(function* () {
                    // Validate input against schema
                    const validated = yield* Schema.decodeUnknownEffect(
                        CreateIssueInput
                    )(data).pipe(
                        Effect.mapError((error) =>
                            repositoryError(`Validation failed: ${error}`)
                        )
                    )

                    yield* ensureAssigneeBelongsToDomain(
                        domain_id,
                        validated.assignee_id
                    )

                    // Insert with drizzle-orm/effect-postgres
                    const inserted = yield* db
                        .insert(issues)
                        .values({
                            ...validated,
                            domain_id,
                            status: toDbStatus(validated.status),
                            updated_at: Date.now(),
                        })
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (inserted.length === 0) {
                        return yield* Effect.fail(
                            repositoryError("Failed to insert issue")
                        )
                    }

                    const inserted_issue = inserted[0]

                    if (inserted_issue === undefined) {
                        return yield* Effect.fail(
                            repositoryError("Failed to insert issue")
                        )
                    }

                    return {
                        item: normalizeIssue(mapIssue(inserted_issue)),
                        txid: 0, // TODO: Get actual txid from PostgreSQL
                    }
                }).pipe(Effect.mapError(repositoryError)),

            update: (domain_id: string, id: string, data) =>
                Effect.gen(function* () {
                    // Validate input against update schema
                    const validated = yield* Schema.decodeUnknownEffect(
                        UpdateIssueInput
                    )({
                        ...data,
                        id,
                    }).pipe(
                        Effect.mapError((error) =>
                            repositoryError(`Validation failed: ${error}`)
                        )
                    )

                    yield* ensureAssigneeBelongsToDomain(
                        domain_id,
                        validated.assignee_id
                    )

                    const { status, ...rest } = validated

                    // Filter out undefined values
                    const updateData: Record<string, unknown> = {}
                    for (const [key, value] of Object.entries(rest)) {
                        if (key !== "id" && value !== undefined) {
                            updateData[key] = value
                        }
                    }

                    if (status !== undefined) {
                        updateData.status = toDbStatus(status)
                    }

                    const updated = yield* db
                        .update(issues)
                        .set({
                            ...updateData,
                            updated_at: Date.now(),
                        })
                        .where(
                            and(
                                eq(issues.domain_id, domain_id),
                                eq(issues.id, id)
                            )
                        )
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (updated.length === 0) {
                        return yield* Effect.fail(
                            repositoryError(`Issue with ID ${id} not found`)
                        )
                    }

                    const updated_issue = updated[0]

                    if (updated_issue === undefined) {
                        return yield* Effect.fail(
                            repositoryError("Failed to update issue")
                        )
                    }

                    return {
                        item: normalizeIssue(mapIssue(updated_issue)),
                        txid: 0, // TODO: Get actual txid from PostgreSQL
                    }
                }).pipe(Effect.mapError(repositoryError)),

            findById: (domain_id: string, id: string) =>
                Effect.gen(function* () {
                    const results = yield* db
                        .select()
                        .from(issues)
                        .where(
                            and(
                                eq(issues.domain_id, domain_id),
                                eq(issues.id, id)
                            )
                        )
                        .pipe(Effect.mapError(repositoryError))

                    if (results.length === 0) {
                        return null
                    }

                    const found_issue = results[0]

                    if (found_issue === undefined) {
                        return null
                    }

                    return normalizeIssue(mapIssue(found_issue))
                }).pipe(Effect.mapError(repositoryError)),

            findMany: (domain_id: string, { limit = 50 } = {}) =>
                Effect.gen(function* () {
                    const results = yield* db
                        .select()
                        .from(issues)
                        .where(eq(issues.domain_id, domain_id))
                        .orderBy(desc(issues.updated_at))
                        .limit(limit)
                        .pipe(Effect.mapError(repositoryError))
                    return results.map((issue) =>
                        normalizeIssue(mapIssue(issue))
                    )
                }).pipe(Effect.mapError(repositoryError)),

            delete: (domain_id: string, id: string) =>
                Effect.gen(function* () {
                    const deleted = yield* db
                        .delete(issues)
                        .where(
                            and(
                                eq(issues.domain_id, domain_id),
                                eq(issues.id, id)
                            )
                        )
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (deleted.length === 0) {
                        return yield* Effect.fail(
                            repositoryError(`Issue with ID ${id} not found`)
                        )
                    }
                }).pipe(Effect.mapError(repositoryError)),
        }

        return repository
    })
)

export const IssueLabelsRepositoryLive = Layer.effect(
    IssueLabelsRepository,
    Effect.gen(function* () {
        const db = yield* DB

        const repository: IssueLabelsRepositoryType = {
            insert: (domain_id, data) =>
                Effect.gen(function* () {
                    // Validate input against schema
                    const validated = yield* Schema.decodeUnknownEffect(
                        CreateIssueLabelInput
                    )(data).pipe(
                        Effect.mapError((error) =>
                            repositoryError(`Validation failed: ${error}`)
                        )
                    )

                    // Insert with drizzle-orm/effect-postgres
                    const inserted = yield* db
                        .insert(issue_labels)
                        .values({
                            ...validated,
                            domain_id,
                            updated_at: Date.now(),
                        })
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (inserted.length === 0) {
                        return yield* Effect.fail(
                            repositoryError("Failed to insert issue label")
                        )
                    }

                    const inserted_label = inserted[0]

                    if (inserted_label === undefined) {
                        return yield* Effect.fail(
                            repositoryError("Failed to insert issue label")
                        )
                    }

                    return {
                        item: toIssueLabel(inserted_label),
                        txid: 0, // TODO: Get actual txid from PostgreSQL
                    }
                }).pipe(Effect.mapError(repositoryError)),

            update: (domain_id: string, id: string, data) =>
                Effect.gen(function* () {
                    // Validate input against update schema
                    const validated = yield* Schema.decodeUnknownEffect(
                        UpdateIssueLabelInput
                    )({
                        ...data,
                        id,
                    }).pipe(
                        Effect.mapError((error) =>
                            repositoryError(`Validation failed: ${error}`)
                        )
                    )

                    // Filter out undefined values
                    const updateData: Record<string, unknown> = {}
                    for (const [key, value] of Object.entries(validated)) {
                        if (key !== "id" && value !== undefined) {
                            updateData[key] = value
                        }
                    }

                    const updated = yield* db
                        .update(issue_labels)
                        .set({
                            ...updateData,
                            updated_at: Date.now(),
                        })
                        .where(
                            and(
                                eq(issue_labels.domain_id, domain_id),
                                eq(issue_labels.id, id)
                            )
                        )
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (updated.length === 0) {
                        return yield* Effect.fail(
                            repositoryError(
                                `Issue label with ID ${id} not found`
                            )
                        )
                    }

                    const updated_label = updated[0]

                    if (updated_label === undefined) {
                        return yield* Effect.fail(
                            repositoryError("Failed to update issue label")
                        )
                    }

                    return {
                        item: toIssueLabel(updated_label),
                        txid: 0, // TODO: Get actual txid from PostgreSQL
                    }
                }).pipe(Effect.mapError(repositoryError)),

            findById: (domain_id: string, id: string) =>
                Effect.gen(function* () {
                    const results = yield* db
                        .select()
                        .from(issue_labels)
                        .where(
                            and(
                                eq(issue_labels.domain_id, domain_id),
                                eq(issue_labels.id, id)
                            )
                        )
                        .pipe(Effect.mapError(repositoryError))

                    if (results.length === 0) {
                        return null
                    }

                    const found_label = results[0]

                    if (found_label === undefined) {
                        return null
                    }

                    return toIssueLabel(found_label)
                }).pipe(Effect.mapError(repositoryError)),

            findMany: (domain_id: string, { limit = 50 } = {}) =>
                Effect.gen(function* () {
                    const results = yield* db
                        .select()
                        .from(issue_labels)
                        .where(eq(issue_labels.domain_id, domain_id))
                        .limit(limit)
                        .pipe(Effect.mapError(repositoryError))

                    return results.map(toIssueLabel)
                }).pipe(Effect.mapError(repositoryError)),

            delete: (domain_id: string, id: string) =>
                Effect.gen(function* () {
                    const deleted = yield* db
                        .delete(issue_labels)
                        .where(
                            and(
                                eq(issue_labels.domain_id, domain_id),
                                eq(issue_labels.id, id)
                            )
                        )
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (deleted.length === 0) {
                        return yield* Effect.fail(
                            repositoryError(
                                `Issue label with ID ${id} not found`
                            )
                        )
                    }
                }).pipe(Effect.mapError(repositoryError)),
        }

        return repository
    })
)
