import { Submodel } from "foldkit"
import type { Message as LogoMessage } from "./message.ts"
import type { Model as LogoModel } from "./model.ts"
import { view as logo_view } from "./view.ts"

export {
    ElementKind,
    LogoElement,
    Model,
    PaintToken,
    initial_model,
    model_from_scene,
    scene_from_model,
} from "./model.ts"
export {
    ChangedGeometry,
    FailedSaving,
    GeometryProperty,
    Message,
    RequestedSave,
    Saved,
    StartedSaving,
    ToggledSnapToGrid,
} from "./message.ts"
export { update } from "./update.ts"

export const view = Submodel.defineView<LogoModel, LogoMessage>(logo_view)
