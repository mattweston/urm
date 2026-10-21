import { Option, Schema as S } from "effect"

export const BoardId = S.Literals(["launch", "empty"])
export const Tool = S.Literals(["Select", "Rectangle", "Hand"])
export const Fill = S.Literals([
    "fill-chart-4",
    "fill-chart-2",
    "fill-chart-3",
    "fill-chart-5",
])
export const Shape = S.Struct({
    id: S.String,
    label: S.String,
    x: S.Number,
    y: S.Number,
    width: S.Number,
    height: S.Number,
    fill: Fill,
})
export type Shape = typeof Shape.Type
export const Document = S.Struct({
    id: BoardId,
    title: S.String,
    updated_by: S.String,
    shapes: S.Array(Shape),
})
export type Document = typeof Document.Type
export const Model = S.Struct({
    document: Document,
    selected_ids: S.Array(S.String),
    undo_stack: S.Array(Document),
    redo_stack: S.Array(Document),
    tool: Tool,
    zoom: S.Number,
    is_online: S.Boolean,
    sync_state: S.Literals(["Saved", "Saving", "Queued", "Error"]),
    revision: S.Number,
    saved_revision: S.Number,
    activity: S.Option(S.String),
})
export type Model = typeof Model.Type

const launchShapes: ReadonlyArray<Shape> = [
    {
        id: "audience",
        label: "Audience insight",
        x: 112,
        y: 112,
        width: 224,
        height: 128,
        fill: "fill-chart-4",
    },
    {
        id: "prototype",
        label: "Prototype flow",
        x: 448,
        y: 94,
        width: 244,
        height: 152,
        fill: "fill-chart-2",
    },
    {
        id: "launch-plan",
        label: "Launch plan",
        x: 354,
        y: 366,
        width: 260,
        height: 142,
        fill: "fill-chart-3",
    },
    {
        id: "open-question",
        label: "Open question",
        x: 760,
        y: 296,
        width: 210,
        height: 132,
        fill: "fill-chart-5",
    },
]
export const boardForId = (id: typeof BoardId.Type): Document =>
    id === "empty"
        ? { id, title: "Blank exploration", updated_by: "You", shapes: [] }
        : {
              id,
              title: "Launch narrative",
              updated_by: "Maya and two others",
              shapes: launchShapes,
          }
export const initialModel = (id: typeof BoardId.Type): Model => ({
    document: boardForId(id),
    selected_ids: [],
    undo_stack: [],
    redo_stack: [],
    tool: "Select",
    zoom: 1,
    is_online: true,
    sync_state: "Saved",
    revision: 0,
    saved_revision: 0,
    activity: Option.none(),
})
