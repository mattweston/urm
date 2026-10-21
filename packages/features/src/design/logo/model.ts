import { Schema as S } from "effect"
import {
    LogoCircleElement,
    LogoElement as LogoElementSchema,
    LogoLineElement,
    LogoPaintToken,
    LogoRectElement,
    type LogoScene,
    default_logo_scene,
    default_logo_view_box,
} from "@urm/domain/schemas/logos"

export const PaintToken = LogoPaintToken
export type PaintToken = typeof PaintToken.Type

export const ElementKind = S.Literals(["Rectangle", "Circle", "Line"])
export type ElementKind = typeof ElementKind.Type

export const Point = S.Struct({ x: S.Number, y: S.Number })
export type Point = typeof Point.Type

export const RectElement = LogoRectElement
export type RectElement = typeof RectElement.Type
export const CircleElement = LogoCircleElement
export type CircleElement = typeof CircleElement.Type
export const LineElement = LogoLineElement
export type LineElement = typeof LineElement.Type
export const LogoElement = LogoElementSchema
export type LogoElement = typeof LogoElement.Type

export const Model = S.Struct({
    elements: S.Array(LogoElement),
    snap_to_grid: S.Boolean,
    selected_element_id: S.String,
    next_element_number: S.Number,
    past: S.Array(S.Array(LogoElement)),
    future: S.Array(S.Array(LogoElement)),
    drag: S.NullOr(
        S.Struct({
            id: S.String,
            start: Point,
            before: S.Array(LogoElement),
        })
    ),
    save_status: S.Literals(["idle", "saving", "saved", "error"]),
    save_message: S.String,
})
export type Model = typeof Model.Type

export const urm_template_elements: ReadonlyArray<LogoElement> =
    default_logo_scene.elements

export const initial_model: Model = {
    elements: [],
    snap_to_grid: true,
    selected_element_id: "",
    next_element_number: 1,
    past: [],
    future: [],
    drag: null,
    save_status: "idle",
    save_message: "",
}

export const scene_from_model = (model: Model): LogoScene => ({
    schema_version: 1,
    view_box: default_logo_view_box,
    elements: model.elements,
})

export const model_from_scene = (scene: LogoScene): Model => ({
    ...initial_model,
    elements: scene.elements,
    next_element_number: scene.elements.length + 1,
})
