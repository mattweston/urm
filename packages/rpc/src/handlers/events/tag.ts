import { Context } from "effect"

import type { EventMenuItemsRpcHandlers, EventsRpcHandlers } from "./index.js"

export class EventsRpcHandlersTag extends Context.Service<
    EventsRpcHandlersTag,
    EventsRpcHandlers
>()("EventsRpcHandlers") {}

export class EventMenuItemsRpcHandlersTag extends Context.Service<
    EventMenuItemsRpcHandlersTag,
    EventMenuItemsRpcHandlers
>()("EventMenuItemsRpcHandlers") {}
