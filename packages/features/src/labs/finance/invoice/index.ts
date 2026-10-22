export { Model, init } from "./model.ts"
export { Message, update } from "./update.ts"
export { view } from "./view.ts"
export const invoice_href = () => "/finance/invoice"
export const is_invoice_path = (path: string): boolean =>
    path.replace(/\/$/, "") === "/finance/invoice"
