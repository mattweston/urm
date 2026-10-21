/** # Submodel
 *
 *  What a Submodel is and when a part of the app deserves one. The live demo
 *  of embedding one twice is the sibling `components/embedding` lesson.
 */
export {
    DemoMessage as Message,
    DemoModel as Model,
    demoInit as init,
    demoUpdate as update,
} from "./submodel.ts"
export type {
    DemoMessage as MessageType,
    DemoModel as ModelType,
} from "./submodel.ts"
export { is_submodel_path, submodel_href } from "./route.ts"
export { view } from "./submodel.view.ts"
