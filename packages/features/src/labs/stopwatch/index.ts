export { Message } from "./stopwatch.message.ts"
export type { Message as MessageType } from "./stopwatch.message.ts"
export { Model } from "./stopwatch.model.ts"
export type { Model as ModelType } from "./stopwatch.model.ts"
export { subscriptions } from "./stopwatch.subscription.ts"
export { init, update } from "./stopwatch.update.ts"
export { view } from "./stopwatch.view.ts"

const BASE = "/learn/stopwatch"

export const isStopwatchPath = (pathname: string) =>
    pathname === BASE || pathname.startsWith(`${BASE}/`)

export const stopwatchHref = () => `${BASE}/`
