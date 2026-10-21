/**
 * The `Flex` layout primitive: three prop unions, each mapped onto exactly one
 * Tailwind class, over a `flex w-full` base.
 */
import { Schema as S } from "effect"
import type { Attribute, Html, HtmlBuilder } from "foldkit/html"
import { cn } from "@urm/utils/layout"

export const FlexDirection = S.Literals([
    "row",
    "col",
    "row-reverse",
    "col-reverse",
])
export type FlexDirection = typeof FlexDirection.Type

export const JustifyContent = S.Literals([
    "start",
    "end",
    "center",
    "between",
    "around",
    "evenly",
])
export type JustifyContent = typeof JustifyContent.Type

export const AlignItems = S.Literals([
    "start",
    "end",
    "center",
    "baseline",
    "stretch",
])
export type AlignItems = typeof AlignItems.Type

export const FLEX_DIRECTION_CLASS_NAMES: Record<FlexDirection, string> = {
    row: "flex-row",
    col: "flex-col",
    "row-reverse": "flex-row-reverse",
    "col-reverse": "flex-col-reverse",
}

export const JUSTIFY_CONTENT_CLASS_NAMES: Record<JustifyContent, string> = {
    start: "justify-start",
    end: "justify-end",
    center: "justify-center",
    between: "justify-between",
    around: "justify-around",
    evenly: "justify-evenly",
}

export const ALIGN_ITEMS_CLASS_NAMES: Record<AlignItems, string> = {
    start: "items-start",
    end: "items-end",
    center: "items-center",
    baseline: "items-baseline",
    stretch: "items-stretch",
}

export const DEFAULT_FLEX_DIRECTION: FlexDirection = "row"
export const DEFAULT_JUSTIFY_CONTENT: JustifyContent = "between"
export const DEFAULT_ALIGN_ITEMS: AlignItems = "center"

export type FlexConfig = Readonly<{
    flexDirection?: FlexDirection
    justifyContent?: JustifyContent
    alignItems?: AlignItems
    // merged last, so a caller's utility beats the one the props chose
    className?: string
}>

export const flexClassName = (config: FlexConfig = {}): string =>
    cn(
        "flex w-full",
        FLEX_DIRECTION_CLASS_NAMES[
            config.flexDirection ?? DEFAULT_FLEX_DIRECTION
        ],
        JUSTIFY_CONTENT_CLASS_NAMES[
            config.justifyContent ?? DEFAULT_JUSTIFY_CONTENT
        ],
        ALIGN_ITEMS_CLASS_NAMES[config.alignItems ?? DEFAULT_ALIGN_ITEMS],
        config.className
    )

// A select hands back a bare string; these narrow it against the schema's own
// literals rather than casting.
export const parseFlexDirection = (value: string): FlexDirection | undefined =>
    FlexDirection.literals.find((literal) => literal === value)

export const parseJustifyContent = (
    value: string
): JustifyContent | undefined =>
    JustifyContent.literals.find((literal) => literal === value)

export const parseAlignItems = (value: string): AlignItems | undefined =>
    AlignItems.literals.find((literal) => literal === value)

/**
 * A second `h.Class` replaces the first rather than merging with it, so the
 * computed class goes on last and callers pass extra classes through
 * `config.className`.
 */
export const flex = <Message>(
    config: FlexConfig,
    attributes: ReadonlyArray<Attribute<Message>>,
    children: ReadonlyArray<Html>,
    h: HtmlBuilder<Message>
): Html => h.div([...attributes, h.Class(flexClassName(config))], children)
