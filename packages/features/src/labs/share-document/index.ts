export { Message } from "./share-document.message.ts"
export type { Message as MessageType } from "./share-document.message.ts"
export { Model } from "./share-document.model.ts"
export type { Model as ModelType } from "./share-document.model.ts"
export { init, update } from "./share-document.update.ts"
export { view } from "./view.ts"

const BASE = "/labs/documents/share-document"

export const isShareDocumentPath = (pathname: string) =>
    pathname === BASE || pathname.startsWith(`${BASE}/`)

export const shareDocumentHref = () => `${BASE}/`
