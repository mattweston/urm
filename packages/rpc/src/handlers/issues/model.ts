/**
 * # Issues RPC Model
 *
 * Pairs Drizzle table with Effect schemas
 *
 * Re-exports schemas from @urm/shared (source of truth)
 * and tables from db/schema (database structure).
 *
 * This file is the "model aggregator" for the issues feature:
 * - Drizzle tables: issues, issue_labels
 * - Effect schemas: Issue, IssueLabel, CreateIssueInput, UpdateIssueInput, CreateIssueLabelInput, UpdateIssueLabelInput
 * - Error types: NotFoundError, DatabaseError, ConflictError
 */

import {
    Issue,
    IssueLabel,
    IssueStatus,
    IssuePriority,
    CreateIssueInput,
    UpdateIssueInput,
    CreateIssueLabelInput,
    UpdateIssueLabelInput,
    NotFoundError,
    DatabaseError,
    ConflictError,
    ValidationError,
} from "@urm/domain/schemas/issues"

// Re-export Drizzle tables and inferred types
export { issues, issue_labels } from "@urm/database/legacy-schema/issues"
export type {
    Issue as IssueRow,
    NewIssue,
    IssueLabel as IssueLabelRow,
    NewIssueLabel,
} from "@urm/database/legacy-schema/issues"

// Re-export Effect schemas (used in routes and handlers)
export {
    Issue,
    IssueLabel,
    IssueStatus,
    IssuePriority,
    CreateIssueInput,
    UpdateIssueInput,
    CreateIssueLabelInput,
    UpdateIssueLabelInput,
    NotFoundError,
    DatabaseError,
    ConflictError,
    ValidationError,
}

export const IssuesModel = {
    insert: CreateIssueInput,
    update: UpdateIssueInput,
    select: Issue,
}

export const IssueLabelsModel = {
    insert: CreateIssueLabelInput,
    update: UpdateIssueLabelInput,
    select: IssueLabel,
}
