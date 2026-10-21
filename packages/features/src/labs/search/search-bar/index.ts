export { Message } from "./search-bar.message.ts"
export type { Message as MessageType } from "./search-bar.message.ts"
export { Model } from "./search-bar.model.ts"
export type { Model as ModelType } from "./search-bar.model.ts"
export { init, update } from "./search-bar.update.ts"
export { view } from "./view.ts"
export type { SearchSection } from "./view.ts"

const BASE = "/labs/search/search-bar"

export const isSearchBarPath = (pathname: string) =>
    pathname === BASE || pathname.startsWith(`${BASE}/`)

export const searchBarHref = () => `${BASE}/`
