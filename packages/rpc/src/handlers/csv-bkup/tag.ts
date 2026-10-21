import { Context } from "effect"

import type { CsvRpcHandlers } from "./index.ts"

export class CsvRpcHandlersTag extends Context.Service<
    CsvRpcHandlersTag,
    CsvRpcHandlers
>()("CsvRpcHandlers") {}
