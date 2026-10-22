/** # Learn submodel
 *
 *  The single surface `main.ts` imports for everything under `/labs/learn`. Adding a
 *  lesson touches this module's catalogue, model, message, init, update and
 *  view — never the app shell.
 */
import "./styles.ts"

export { lessons } from "./lessons.ts"
export type { Lesson } from "./lessons.ts"
export {
    GotApiEffectMessage,
    GotFoldkitMessage,
    GotManagedResourceLayerMessage,
    GotNullishCoalescingInputMessage,
    GotNumberMessage,
    GotReduceMessage,
    GotEffectRunnerMessage,
    Message,
} from "./message.ts"
export type { Message as MessageType } from "./message.ts"
export { Model } from "./model.ts"
export type { Model as ModelType } from "./model.ts"
export { changed_route } from "./changed-route.ts"
export type { ChangedRouteReturn } from "./changed-route.ts"
export { init } from "./init.ts"
export type { InitReturn } from "./init.ts"
export { update } from "./update.ts"
export type { Services, UpdateReturn } from "./update.ts"
export { index_view, view } from "./lessons-view.ts"
export { breadcrumb, route_tag, route_title } from "./nav.ts"
export { nav_items } from "./sidebar.ts"
