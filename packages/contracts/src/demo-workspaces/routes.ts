import { Schema } from "effect"
import { Rpc, RpcGroup } from "effect/unstable/rpc"
import { AuthenticatedRpcMiddleware } from "../auth-legacy/rpc-middleware.ts"
import { DemoWorkspaceProvisioned } from "@urm/domain/schemas/demo-workspaces"
import { AuthorizationError, DatabaseError } from "@urm/domain/errors"

export const DemoWorkspaceProvisionRpc = Rpc.make("demo.workspace.provision", {
    payload: Schema.Struct({}),
    success: DemoWorkspaceProvisioned,
    error: Schema.Union([AuthorizationError, DatabaseError]),
})

export const DemoWorkspaceRpcs = RpcGroup.make(
    DemoWorkspaceProvisionRpc
).middleware(AuthenticatedRpcMiddleware)
