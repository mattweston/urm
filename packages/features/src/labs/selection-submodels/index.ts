export {
    ClickedClearSelectionSubmodelsPlan,
    GotSelectionSubmodelsListboxMessage,
    RestoredSelectionSubmodelsPlan,
    SelectionSubmodelsMessage as Message,
} from "./message.ts"
export type { SelectionSubmodelsMessage as MessageType } from "./message.ts"
export { initialModel, Model } from "./model.ts"
export type { Model as ModelType } from "./model.ts"
export { update } from "./update.ts"
export { view } from "./view.ts"

const BASE = "/learn/selection-submodels"

export const isSelectionSubmodelsPath = (pathname: string) =>
    pathname === BASE || pathname.startsWith(`${BASE}/`)

export const selectionSubmodelsHref = () => `${BASE}/`
