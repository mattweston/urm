import { Context } from "effect"

import type { TagsRpcHandlers } from "./index.ts"

export class TagsRpcHandlersTag extends Context.Service<
    TagsRpcHandlersTag,
    TagsRpcHandlers
>()("TagsRpcHandlers") {}
