/**
 * # Audit RPC Contracts
 *
 * RPC definitions for audit event queries.
 */

import { Schema } from "effect"
import { Rpc, RpcGroup } from "effect/rpc"
import {
    AuditEventFilter,
    AuditEventList,
    DatabaseError,
} from "@urm/domain/schemas/audit"
import { AuthorizationError } from "@urm/domain/errors"
import {
    AuthenticatedRpcMiddleware,
    PlatformAdminRpcMiddleware,
} from "../auth-legacy/rpc-middleware.ts"

export const AuditListRpc = Rpc.make("audit.list", {
    payload: AuditEventFilter,
    success: AuditEventList,
    error: Schema.Union([AuthorizationError, DatabaseError]),
})

export const AuditRpcs = RpcGroup.make(AuditListRpc)
    .middleware(PlatformAdminRpcMiddleware)
    .middleware(AuthenticatedRpcMiddleware)
