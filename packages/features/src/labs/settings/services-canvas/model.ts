import { Schema as S } from "effect"
import { Canvas } from "foldkit"

export const Service = S.Struct({
    id: S.String,
    title: S.String,
    description: S.String,
    kind: S.Literals(["Web", "Database", "Worker"]),
    x: S.Number,
    y: S.Number,
    target: S.String,
})
export type Service = typeof Service.Type
export const Model = S.Struct({
    nodes: S.Array(Service),
    past: S.Array(S.Array(Service)),
    future: S.Array(S.Array(Service)),
    selected: S.String,
    x: S.Number,
    y: S.Number,
    zoom: S.Number,
    show_grid: S.Boolean,
    show_edges: S.Boolean,
    drag: S.NullOr(
        S.Struct({
            id: S.String,
            start: Canvas.Point,
            origin: Canvas.Point,
            before: S.Array(Service),
        })
    ),
})
export type Model = typeof Model.Type
export const initial_model: Model = {
    nodes: [
        {
            id: "web",
            title: "Web application",
            description: "app.example.test",
            kind: "Web",
            x: 100,
            y: 100,
            target: "database",
        },
        {
            id: "database",
            title: "PostgreSQL",
            description: "Private network · PostgreSQL 17",
            kind: "Database",
            x: 650,
            y: 240,
            target: "",
        },
        {
            id: "worker",
            title: "Background worker",
            description: "Jobs and scheduled tasks",
            kind: "Worker",
            x: 100,
            y: 380,
            target: "database",
        },
    ],
    past: [],
    future: [],
    selected: "",
    x: 0,
    y: 0,
    zoom: 1,
    show_grid: true,
    show_edges: true,
    drag: null,
}
