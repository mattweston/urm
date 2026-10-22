export { Message } from "./message.ts"
export type { Message as MessageType } from "./message.ts"
export { Model } from "./model.ts"
export type { Model as ModelType } from "./model.ts"
export { subscriptions } from "./subscription.ts"
export { init, update } from "./update.ts"
export { view } from "./view.ts"

const BASE = "/games/snake"

export const isSnakePath = (pathname: string) =>
    pathname === BASE || pathname.startsWith(`${BASE}/`)

export const snakeHref = () => `${BASE}/`
