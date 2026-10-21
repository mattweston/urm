import { RemoteRpc } from "foldkit-remote"
import { AuthenticatedRpcMiddleware } from "../auth/index.ts"

export const RpcApi = RemoteRpc.omit("FoldkitRemoteLive").middleware(
    AuthenticatedRpcMiddleware
)
