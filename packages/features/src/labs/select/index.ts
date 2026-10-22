export { Message, UpdatedValue } from "./message.ts"
export type { Message as MessageType } from "./message.ts"
export { Model } from "./model.ts"
export { update } from "./update.ts"
export { view } from "./view.ts"
export { initialModel } from "./model.ts"

const BASE = "/ui/select"

export const isSelectPath = (pathname: string) =>
    pathname === BASE || pathname.startsWith(`${BASE}/`)

export const selectHref = () => `${BASE}/`
