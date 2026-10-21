import type { VariableName } from "./variables.message.ts"
import type { Model } from "./variables.model.ts"

export type Range = Readonly<{
    minimum: number
    maximum: number
    step: number
    /** Pointer travel, in pixels, that moves the value by one step. */
    pixelsPerStep: number
}>

export const ranges: Readonly<Record<VariableName, Range>> = {
    count: { minimum: 0, maximum: 24, step: 1, pixelsPerStep: 14 },
    width: { minimum: 1, maximum: 24, step: 1, pixelsPerStep: 14 },
    height: { minimum: 1, maximum: 12, step: 1, pixelsPerStep: 20 },
}

export type Derived = Readonly<{
    area: number
    perimeter: number
    isSquare: boolean
    slug: string
    status: string
}>

const toSlug = (text: string): string =>
    text
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")

// Everything here is a function of the Model, and only of the Model. Call it on
// the way to the view and there is no second copy to keep in step.
export const derive = (model: Model): Derived => ({
    area: model.width * model.height,
    perimeter: 2 * (model.width + model.height),
    isSquare: model.width === model.height,
    slug: toSlug(model.workspaceName),
    status: model.isPublished ? "Published" : "Draft",
})
