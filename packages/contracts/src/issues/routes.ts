import { Schema } from "effect"
import { Rpc, RpcGroup } from "effect/rpc"
import {
    ActiveDomainRpcMiddleware,
    AuthenticatedRpcMiddleware,
    DomainManagerRpcMiddleware,
} from "../auth-legacy/rpc-middleware.ts"
import {
    ConflictError,
    DatabaseError,
    Issue,
    IssueLabel,
    CreateIssueInput,
    UpdateIssueInput,
    CreateIssueLabelInput,
    UpdateIssueLabelInput,
    NotFoundError,
    ValidationError,
} from "@urm/domain/schemas/issues"

export const IssuesListRpc = Rpc.make("issues.list", {
    payload: Schema.Struct({}),
    success: Schema.Array(Issue),
    error: DatabaseError,
})

export const IssuesGetRpc = Rpc.make("issues.get", {
    payload: Schema.Struct({ id: Schema.String }),
    success: Issue,
    error: Schema.Union([NotFoundError, DatabaseError]),
})

export const IssuesCreateRpc = Rpc.make("issues.create", {
    payload: Schema.Struct({ data: CreateIssueInput }),
    success: Schema.Struct({ item: Issue, txid: Schema.Number }),
    error: Schema.Union([DatabaseError, ConflictError, ValidationError]),
})

export const IssuesUpdateRpc = Rpc.make("issues.update", {
    payload: Schema.Struct({ id: Schema.String, data: UpdateIssueInput }),
    success: Schema.Struct({ item: Issue, txid: Schema.Number }),
    error: Schema.Union([NotFoundError, DatabaseError, ValidationError]),
})

export const IssuesDeleteRpc = Rpc.make("issues.delete", {
    payload: Schema.Struct({ id: Schema.String }),
    success: Schema.Struct({ txid: Schema.Number }),
    error: Schema.Union([NotFoundError, DatabaseError]),
})

export const IssueLabelsListRpc = Rpc.make("issueLabels.list", {
    payload: Schema.Struct({}),
    success: Schema.Array(IssueLabel),
    error: DatabaseError,
})

export const IssueLabelsGetRpc = Rpc.make("issueLabels.get", {
    payload: Schema.Struct({ id: Schema.String }),
    success: IssueLabel,
    error: Schema.Union([NotFoundError, DatabaseError]),
})

export const IssueLabelsCreateRpc = Rpc.make("issueLabels.create", {
    payload: Schema.Struct({ data: CreateIssueLabelInput }),
    success: Schema.Struct({ item: IssueLabel, txid: Schema.Number }),
    error: Schema.Union([DatabaseError, ConflictError, ValidationError]),
})

export const IssueLabelsUpdateRpc = Rpc.make("issueLabels.update", {
    payload: Schema.Struct({ id: Schema.String, data: UpdateIssueLabelInput }),
    success: Schema.Struct({ item: IssueLabel, txid: Schema.Number }),
    error: Schema.Union([NotFoundError, DatabaseError, ValidationError]),
})

export const IssueLabelsDeleteRpc = Rpc.make("issueLabels.delete", {
    payload: Schema.Struct({ id: Schema.String }),
    success: Schema.Struct({ txid: Schema.Number }),
    error: Schema.Union([NotFoundError, DatabaseError]),
})

export const IssuesRpcs = RpcGroup.make(
    IssuesListRpc,
    IssuesGetRpc,
    IssuesCreateRpc,
    IssuesUpdateRpc,
    IssuesDeleteRpc
)
    .middleware(DomainManagerRpcMiddleware)
    .middleware(ActiveDomainRpcMiddleware)
    .middleware(AuthenticatedRpcMiddleware)

export const IssueLabelsRpcs = RpcGroup.make(
    IssueLabelsListRpc,
    IssueLabelsGetRpc,
    IssueLabelsCreateRpc,
    IssueLabelsUpdateRpc,
    IssueLabelsDeleteRpc
)
    .middleware(DomainManagerRpcMiddleware)
    .middleware(ActiveDomainRpcMiddleware)
    .middleware(AuthenticatedRpcMiddleware)
