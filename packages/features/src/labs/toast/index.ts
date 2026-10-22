export { GotToastDemoMessage, ToastDemoMessage as Message } from "./message.ts"
export type { ToastDemoMessage as MessageType } from "./message.ts"
export { Model } from "./model.ts"
export type { Model as ModelType } from "./model.ts"
export { init, update } from "./update.ts"
export { view } from "./view.ts"

const BASE = "/ui/toast"

export const isToastPath = (pathname: string) =>
    pathname === BASE || pathname.startsWith(`${BASE}/`)

export const toastHref = () => `${BASE}/`
