import { Context } from "effect"
import type { TasksRpcHandlers } from "./index.ts"

export class TasksRpcHandlersTag extends Context.Service<
    TasksRpcHandlersTag,
    TasksRpcHandlers
>()("TasksRpcHandlers") {}
