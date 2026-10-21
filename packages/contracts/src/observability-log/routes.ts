/**
 * # Observability Log RPC Contracts
 *
 * RPC definitions for querying observability logs.
 */

import { Schema } from "effect"
import { Rpc, RpcGroup } from "effect/rpc"
import { AuthorizationError } from "@urm/domain/errors"
import {
    AuthenticatedRpcMiddleware,
    PlatformAdminRpcMiddleware,
} from "../auth-legacy/rpc-middleware.ts"
import {
    ObservabilityLogFilter,
    ObservabilityLogList,
    DatabaseError,
} from "@urm/domain/schemas/observability-log"

export const ObservabilityLogListRpc = Rpc.make("observability-log.list", {
    payload: ObservabilityLogFilter,
    success: ObservabilityLogList,
    error: Schema.Union([AuthorizationError, DatabaseError]),
})

export const ObservabilityLogRpcs = RpcGroup.make(ObservabilityLogListRpc)
    .middleware(PlatformAdminRpcMiddleware)
    .middleware(AuthenticatedRpcMiddleware)
