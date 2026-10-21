export { Message } from "./todo.message.ts"
export type { Message as MessageType } from "./todo.message.ts"
export { Model } from "./todo.model.ts"
export type { Model as ModelType } from "./todo.model.ts"
export { init, update } from "./todo.update.ts"
export { view } from "./todo.view.ts"

const BASE = "/labs/projects/todo"

export const isTodoPath = (pathname: string) =>
    pathname === BASE || pathname.startsWith(`${BASE}/`)

export const todoHref = () => `${BASE}/`
