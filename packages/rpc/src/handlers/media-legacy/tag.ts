import { Context } from "effect"

import type { MediaRpcHandlers } from "./index.ts"

export class MediaRpcHandlersTag extends Context.Service<
    MediaRpcHandlersTag,
    MediaRpcHandlers
>()("MediaRpcHandlers") {}
