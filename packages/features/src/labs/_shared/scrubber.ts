import { Cause, Effect, Option, Queue, Schema as S, Stream } from "effect"
import { Mount } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { taggedStruct } from "foldkit/schema"

// The Mount reports a bare value. Every caller maps it into a Message of its
// own before it reaches a Model, so this tag never appears in an update.
const ScrubbedNumber = taggedStruct("ScrubbedNumber", { value: S.Number })

const clamp = (value: number, minimum: number, maximum: number) =>
    Math.min(Math.max(value, minimum), maximum)

const snap = (value: number, step: number) => Math.round(value / step) * step

const readNumber = (
    element: HTMLElement,
    key: string,
    fallback: number
): number => {
    const parsed = Number.parseFloat(element.dataset[key] ?? "")

    return Number.isNaN(parsed) ? fallback : parsed
}

type Drag = Readonly<{
    pointerId: number
    startX: number
    startValue: number
    lastValue: number
}>

// Bounds and the current value are read from data attributes when the drag
// starts, not captured as Mount args: a Mount runs once when its element is
// inserted, and this element re-renders on every step of the drag.
const listenForDrag = (
    element: Element,
    queue: Queue.Queue<typeof ScrubbedNumber.Type, Cause.Done>
): (() => void) => {
    if (!(element instanceof HTMLElement)) {
        return () => undefined
    }

    let maybeDrag: Drag | undefined

    const endDrag = () => {
        if (maybeDrag === undefined) {
            return
        }

        element.releasePointerCapture(maybeDrag.pointerId)
        element.removeEventListener("pointermove", handlePointerMove)
        element.removeEventListener("pointerup", endDrag)
        element.removeEventListener("pointercancel", endDrag)
        element.removeAttribute("data-scrubbing")
        document.body.style.removeProperty("cursor")
        document.body.style.removeProperty("user-select")
        maybeDrag = undefined
    }

    const handlePointerMove = (event: PointerEvent) => {
        if (maybeDrag === undefined) {
            return
        }

        const step = readNumber(element, "step", 1)
        const pixelsPerStep = readNumber(element, "pixelsPerStep", 5)
        const steps = Math.round(
            (event.clientX - maybeDrag.startX) / pixelsPerStep
        )
        const value = clamp(
            snap(maybeDrag.startValue + steps * step, step),
            readNumber(element, "minimum", 0),
            readNumber(element, "maximum", 0)
        )

        if (value === maybeDrag.lastValue) {
            return
        }

        maybeDrag = { ...maybeDrag, lastValue: value }
        Queue.offerUnsafe(queue, ScrubbedNumber({ value }))
    }

    const handlePointerDown = (event: PointerEvent) => {
        if (event.button !== 0) {
            return
        }

        endDrag()
        event.preventDefault()

        const startValue = readNumber(element, "value", 0)

        maybeDrag = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startValue,
            lastValue: startValue,
        }

        element.setPointerCapture(event.pointerId)
        element.setAttribute("data-scrubbing", "true")
        document.body.style.setProperty("cursor", "ew-resize")
        document.body.style.setProperty("user-select", "none")
        element.addEventListener("pointermove", handlePointerMove)
        element.addEventListener("pointerup", endDrag)
        element.addEventListener("pointercancel", endDrag)
    }

    element.addEventListener("pointerdown", handlePointerDown)

    return () => {
        endDrag()
        element.removeEventListener("pointerdown", handlePointerDown)
    }
}

const ScrubNumber = Mount.defineStream("ScrubNumber", {
    messages: [ScrubbedNumber],
    execute: ({ element }) =>
        Stream.callback<typeof ScrubbedNumber.Type>((queue) =>
            Effect.scoped(
                Effect.gen(function* () {
                    yield* Effect.acquireRelease(
                        Effect.sync(() => listenForDrag(element, queue)),
                        (stopListening) => Effect.sync(() => stopListening())
                    )

                    return yield* Effect.never
                })
            )
        ),
})

export type ScrubberArgs = Readonly<{
    value: number
    minimum: number
    maximum: number
    step: number
    /** Pointer travel, in pixels, that moves the value by one step. */
    pixelsPerStep: number
    label: string
    format: (value: number) => string
    /** Replaces the inline styling, for scrubbers that are not part of a sentence. */
    className?: string
}>

const inlineClassName = [
    "cursor-ew-resize touch-none select-none rounded-sm px-0.5",
    "font-medium text-primary underline decoration-dotted decoration-1 underline-offset-4",
    "hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
    "data-[scrubbing]:bg-primary/15",
].join(" ")

/**
 * A number that is dragged sideways to change it, after Bret Victor's Tangle.
 * Pointer capture keeps the drag alive once the pointer leaves the element,
 * which is why this reaches for a Mount rather than `OnPointerMove`.
 */
export const scrubber = <ParentMessage>(
    args: ScrubberArgs,
    toMessage: (value: number) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const changedBy = (offset: number) =>
        Option.some(
            toMessage(
                clamp(
                    snap(args.value + offset, args.step),
                    args.minimum,
                    args.maximum
                )
            )
        )

    return h.span(
        [
            h.Class(args.className ?? inlineClassName),
            h.Role("slider"),
            h.Attribute("tabindex", "0"),
            h.AriaLabel(args.label),
            h.Attribute("aria-valuemin", String(args.minimum)),
            h.Attribute("aria-valuemax", String(args.maximum)),
            h.Attribute("aria-valuenow", String(args.value)),
            h.Attribute("aria-valuetext", args.format(args.value)),
            h.Attribute("aria-orientation", "horizontal"),
            h.DataAttribute("value", String(args.value)),
            h.DataAttribute("minimum", String(args.minimum)),
            h.DataAttribute("maximum", String(args.maximum)),
            h.DataAttribute("step", String(args.step)),
            h.DataAttribute("pixels-per-step", String(args.pixelsPerStep)),
            h.OnMount(
                Mount.mapMessage(ScrubNumber(), (scrubbed) =>
                    toMessage(scrubbed.value)
                )
            ),
            h.OnKeyDownPreventDefault((key) => {
                if (key === "ArrowLeft" || key === "ArrowDown") {
                    return changedBy(-args.step)
                }

                if (key === "ArrowRight" || key === "ArrowUp") {
                    return changedBy(args.step)
                }

                if (key === "PageDown") {
                    return changedBy(-args.step * 10)
                }

                if (key === "PageUp") {
                    return changedBy(args.step * 10)
                }

                if (key === "Home") {
                    return Option.some(toMessage(args.minimum))
                }

                if (key === "End") {
                    return Option.some(toMessage(args.maximum))
                }

                return Option.none()
            }),
        ],
        [args.format(args.value)]
    )
}
