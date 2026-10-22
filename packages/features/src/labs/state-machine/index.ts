export {
    GotCheckoutMachineMessage,
    StateMachineDemoMessage as Message,
} from "./message.ts"
export type { StateMachineDemoMessage as MessageType } from "./message.ts"
export { Model } from "./model.ts"
export type { Model as ModelType } from "./model.ts"
export { init, update } from "./update.ts"
export { view } from "./view.ts"

const BASE = "/learn/state-machine"

export const isStateMachinePath = (pathname: string) =>
    pathname === BASE || pathname.startsWith(`${BASE}/`)

export const stateMachineHref = () => `${BASE}/`
