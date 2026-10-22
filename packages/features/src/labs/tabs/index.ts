export {
    GotHorizontalTabsMessage,
    GotVerticalTabsMessage,
    Message,
} from "./message.ts"
export type { Message as MessageType } from "./message.ts"
export { Model, TabValue } from "./model.ts"
export type { Model as ModelType } from "./model.ts"
export { init, update } from "./update.ts"
export { view } from "./view.ts"

const BASE = "/ui/tabs"

export const isTabsPath = (pathname: string) =>
    pathname === BASE || pathname.startsWith(`${BASE}/`)

export const tabsHref = () => `${BASE}/`
