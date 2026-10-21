/**
 * # Issues Service
 *
 * API interface implemented by web, native, or test layers
 */

import type { UpdateIssueInput } from "@urm/domain/schemas/issues"
import {
    Issue,
    CreateIssueInput,
    IssueLabel,
    CreateIssueLabelInput,
} from "@urm/domain/schemas/issues"

export interface IssuesApi {
    list(): Promise<Issue[]>

    get(params: { id: string }): Promise<Issue>

    create(data: CreateIssueInput): Promise<{ item: Issue; txid: number }>

    update(params: {
        id: string
        data: Omit<typeof UpdateIssueInput.Type, "id">
    }): Promise<{ item: Issue; txid: number }>

    delete(params: { id: string }): Promise<{ txid: number }>
}

export interface IssueLabelsApi {
    list(): Promise<IssueLabel[]>

    get(params: { id: string }): Promise<IssueLabel>

    create(
        data: CreateIssueLabelInput
    ): Promise<{ item: IssueLabel; txid: number }>

    update(params: {
        id: string
        data: Partial<IssueLabel>
    }): Promise<{ item: IssueLabel; txid: number }>

    delete(params: { id: string }): Promise<{ txid: number }>
}
