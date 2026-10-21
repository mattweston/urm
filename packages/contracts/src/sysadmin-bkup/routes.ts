/**
 * # Studio RPC Contracts
 *
 * RPC definitions for the studio observability tabs: trace spans,
 * server process snapshots, and Effect metric snapshots.
 */

import { Schema } from "effect"
import { Rpc, RpcGroup } from "effect/unstable/rpc"
import { AuthorizationError } from "@urm/domain/errors"
import {
    AuthenticatedRpcMiddleware,
    PlatformAdminRpcMiddleware,
} from "../auth-legacy/rpc-middleware.ts"
import {
    StudioTraceSpansFilter,
    StudioSpanList,
    StudioMetricsList,
    StudioSystemSnapshot,
    StudioSessionsFilter,
    StudioSessionList,
    DatabaseError,
} from "@urm/domain/schemas/studio"

export const StudioTraceSpansRpc = Rpc.make("studio.trace-spans", {
    payload: StudioTraceSpansFilter,
    success: StudioSpanList,
    error: Schema.Union([AuthorizationError, DatabaseError]),
})

export const StudioSystemSnapshotRpc = Rpc.make("studio.system-snapshot", {
    success: StudioSystemSnapshot,
})

export const StudioMetricsSnapshotRpc = Rpc.make("studio.metrics-snapshot", {
    success: StudioMetricsList,
})

export const StudioSessionsRpc = Rpc.make("studio.sessions", {
    payload: StudioSessionsFilter,
    success: StudioSessionList,
    error: Schema.Union([AuthorizationError, DatabaseError]),
})

export const StudioRpcs = RpcGroup.make(
    StudioTraceSpansRpc,
    StudioSystemSnapshotRpc,
    StudioMetricsSnapshotRpc,
    StudioSessionsRpc
)
    .middleware(PlatformAdminRpcMiddleware)
    .middleware(AuthenticatedRpcMiddleware)

/**
 * The same sessions view, narrowed to one organisation.
 *
 * There is no organisation in the payload on purpose. The scope is derived from
 * the caller's own memberships, so a member cannot read another organisation's
 * sessions by asking for them — the way a `domain_id` parameter would allow if a
 * route ever forgot to check it.
 *
 * Only sessions are offered. Metrics and the system snapshot are host-wide and
 * have no per-organisation meaning, and spans cannot be attributed to a domain
 * until `observability_spans` carries one.
 */
export const StudioOrganisationSessionsRpc = Rpc.make(
    "studio.organisation.sessions",
    {
        payload: StudioSessionsFilter,
        success: StudioSessionList,
        error: Schema.Union([AuthorizationError, DatabaseError]),
    }
)

export const StudioOrganisationRpcs = RpcGroup.make(
    StudioOrganisationSessionsRpc
).middleware(AuthenticatedRpcMiddleware)
