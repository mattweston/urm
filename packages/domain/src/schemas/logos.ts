/** # Schemas contracts */
import * as Schema from "effect/Schema"

/**
 * Allowlisted semantic paints keep scenes independent of one theme. The SVG
 * renderer resolves these tokens; arbitrary CSS or URL paints are not scene data.
 */
export const LogoPaintToken = Schema.Literals([
    "background",
    "foreground",
    "card",
    "card-foreground",
    "popover",
    "popover-foreground",
    "primary",
    "primary-foreground",
    "secondary",
    "secondary-foreground",
    "muted",
    "muted-foreground",
    "accent",
    "accent-foreground",
    "destructive",
    "destructive-foreground",
    "success",
    "success-foreground",
    "warning",
    "warning-foreground",
    "border",
    "input",
    "ring",
    "chart-1",
    "chart-2",
    "chart-3",
    "chart-4",
    "chart-5",
])
export type LogoPaintToken = typeof LogoPaintToken.Type

const Coordinate = Schema.Finite.check(
    Schema.isBetween({ minimum: -10_000, maximum: 10_000 })
)
const Dimension = Schema.Finite.check(
    Schema.isGreaterThanOrEqualTo(0),
    Schema.isLessThanOrEqualTo(10_000)
)
const PositiveDimension = Schema.Finite.check(
    Schema.isGreaterThan(0),
    Schema.isLessThanOrEqualTo(10_000)
)
const Opacity = Schema.Finite.check(
    Schema.isBetween({ minimum: 0, maximum: 1 })
)

const LogoElementFields = {
    id: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(120)),
    name: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(160)),
    paint: LogoPaintToken,
    opacity: Opacity,
}

export const LogoRectElement = Schema.TaggedStruct("Rect", {
    ...LogoElementFields,
    x: Coordinate,
    y: Coordinate,
    width: Dimension,
    height: Dimension,
    radius: Dimension,
})

export const LogoCircleElement = Schema.TaggedStruct("Circle", {
    ...LogoElementFields,
    cx: Coordinate,
    cy: Coordinate,
    radius: Dimension,
    style: Schema.Literals(["Fill", "Stroke"]),
    stroke_width: Dimension,
})

export const LogoLineElement = Schema.TaggedStruct("Line", {
    ...LogoElementFields,
    x1: Coordinate,
    y1: Coordinate,
    x2: Coordinate,
    y2: Coordinate,
    stroke_width: Dimension,
})

export const LogoElement = Schema.Union([
    LogoRectElement,
    LogoCircleElement,
    LogoLineElement,
])
export type LogoElement = typeof LogoElement.Type

export const LogoViewBox = Schema.Struct({
    x: Coordinate,
    y: Coordinate,
    width: PositiveDimension,
    height: PositiveDimension,
})

/**
 * Bounded vector document persisted as one scene snapshot. Editor grids, snapping
 * and selection belong to UI state and must not enter published artwork. Supported
 * geometry is decoded data, not imported SVG markup; an SVG importer would need
 * a separate validation boundary before it could produce this vocabulary.
 */
export const LogoScene = Schema.Struct({
    schema_version: Schema.Literal(1),
    view_box: LogoViewBox,
    elements: Schema.Array(LogoElement).check(Schema.isMaxLength(500)),
})
export type LogoScene = typeof LogoScene.Type

export const default_logo_view_box: typeof LogoViewBox.Type = {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
}

export const default_logo_scene: LogoScene = {
    schema_version: 1,
    view_box: default_logo_view_box,
    elements: [
        {
            _tag: "Rect",
            id: "background",
            name: "Background",
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            radius: 12,
            paint: "card",
            opacity: 1,
        },
        {
            _tag: "Circle",
            id: "outer-ring",
            name: "Outer ring",
            cx: 50,
            cy: 50,
            radius: 28,
            style: "Stroke",
            stroke_width: 2,
            paint: "foreground",
            opacity: 0.8,
        },
        {
            _tag: "Circle",
            id: "inner-ring",
            name: "Inner ring",
            cx: 50,
            cy: 50,
            radius: 18,
            style: "Stroke",
            stroke_width: 1.5,
            paint: "foreground",
            opacity: 0.8,
        },
        {
            _tag: "Line",
            id: "north-line",
            name: "North connector",
            x1: 50,
            y1: 22,
            x2: 50,
            y2: 42,
            stroke_width: 2,
            paint: "foreground",
            opacity: 1,
        },
        {
            _tag: "Line",
            id: "south-line",
            name: "South connector",
            x1: 50,
            y1: 58,
            x2: 50,
            y2: 78,
            stroke_width: 2,
            paint: "foreground",
            opacity: 1,
        },
        {
            _tag: "Line",
            id: "west-line",
            name: "West connector",
            x1: 22,
            y1: 50,
            x2: 42,
            y2: 50,
            stroke_width: 2,
            paint: "foreground",
            opacity: 1,
        },
        {
            _tag: "Line",
            id: "east-line",
            name: "East connector",
            x1: 58,
            y1: 50,
            x2: 78,
            y2: 50,
            stroke_width: 2,
            paint: "foreground",
            opacity: 1,
        },
        {
            _tag: "Circle",
            id: "centre",
            name: "Centre",
            cx: 50,
            cy: 50,
            radius: 8,
            style: "Fill",
            stroke_width: 0,
            paint: "foreground",
            opacity: 1,
        },
        {
            _tag: "Circle",
            id: "north-node",
            name: "North node",
            cx: 50,
            cy: 22,
            radius: 6,
            style: "Fill",
            stroke_width: 0,
            paint: "chart-5",
            opacity: 0.7,
        },
        {
            _tag: "Circle",
            id: "east-node",
            name: "East node",
            cx: 78,
            cy: 50,
            radius: 6,
            style: "Fill",
            stroke_width: 0,
            paint: "chart-4",
            opacity: 0.7,
        },
        {
            _tag: "Circle",
            id: "south-node",
            name: "South node",
            cx: 50,
            cy: 78,
            radius: 6,
            style: "Fill",
            stroke_width: 0,
            paint: "chart-5",
            opacity: 0.7,
        },
        {
            _tag: "Circle",
            id: "west-node",
            name: "West node",
            cx: 22,
            cy: 50,
            radius: 6,
            style: "Fill",
            stroke_width: 0,
            paint: "chart-4",
            opacity: 0.7,
        },
    ],
}
