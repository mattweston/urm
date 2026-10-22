export { Message } from "./message.ts"
export type { Message as MessageType } from "./message.ts"
export { Model } from "./model.ts"
export type { Model as ModelType } from "./model.ts"
export { init } from "./init.ts"
export { handleSlow } from "./slow-warning.event.ts"
export { subscriptions } from "./subscription.ts"
export { update } from "./update.ts"
export { view } from "./view/index.ts"

const BASE = "/studio/slow-warnings"

export const isSlowWarningsPath = (pathname: string) =>
    pathname === BASE || pathname.startsWith(`${BASE}/`)

export const slowWarningsHref = () => `${BASE}/`
