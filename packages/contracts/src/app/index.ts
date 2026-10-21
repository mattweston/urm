/**
 * # App
 *
 * AppRpc is an empty RpcGroup merged with SettingsRpcs and nothing else. The
 * server does not use it — apps/server/src/rpc/layer.ts merges the 21 feature
 * groups directly.
 */

import { RpcGroup } from "effect/unstable/rpc"
import { SettingsRpcs } from "../settings/index.ts"

export const AppRpc = RpcGroup.make().merge(SettingsRpcs)
