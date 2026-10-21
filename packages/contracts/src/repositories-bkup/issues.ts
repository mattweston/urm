/**
 * # Issues Repository
 *  *
 */
import { Context, Effect, Schema } from "effect"
import type { ItemResult } from "../repository.ts"
import { DatabaseError } from "@urm/domain/errors"
import {
    CreateIssueInput,
    CreateIssueLabelInput,
    Issue,
    IssueLabel,
    UpdateIssueInput,
    UpdateIssueLabelInput,
} from "@urm/domain/schemas/issues"

export interface IssuesRepositoryType {
    insert(
        domain_id: string,
        data: Schema.Schema.Type<typeof CreateIssueInput>
    ): Effect.Effect<ItemResult<Issue>, DatabaseError, never>
    update(
        domain_id: string,
        id: string,
        data: Partial<Schema.Schema.Type<typeof UpdateIssueInput>>
    ): Effect.Effect<ItemResult<Issue>, DatabaseError, never>
    findById(
        domain_id: string,
        id: string
    ): Effect.Effect<Issue | null, DatabaseError, never>
    findMany(
        domain_id: string,
        options?: { limit?: number }
    ): Effect.Effect<Issue[], DatabaseError, never>
    delete(
        domain_id: string,
        id: string
    ): Effect.Effect<void, DatabaseError, never>
}

export class IssuesRepository extends Context.Service<
    IssuesRepository,
    IssuesRepositoryType
>()("IssuesRepository") {}

export interface IssueLabelsRepositoryType {
    insert(
        domain_id: string,
        data: Schema.Schema.Type<typeof CreateIssueLabelInput>
    ): Effect.Effect<ItemResult<IssueLabel>, DatabaseError, never>
    update(
        domain_id: string,
        id: string,
        data: Partial<Schema.Schema.Type<typeof UpdateIssueLabelInput>>
    ): Effect.Effect<ItemResult<IssueLabel>, DatabaseError, never>
    findById(
        domain_id: string,
        id: string
    ): Effect.Effect<IssueLabel | null, DatabaseError, never>
    findMany(
        domain_id: string,
        options?: {
            limit?: number
        }
    ): Effect.Effect<IssueLabel[], DatabaseError, never>
    delete(
        domain_id: string,
        id: string
    ): Effect.Effect<void, DatabaseError, never>
}

export class IssueLabelsRepository extends Context.Service<
    IssueLabelsRepository,
    IssueLabelsRepositoryType
>()("IssueLabelsRepository") {}
