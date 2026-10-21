import { Effect, Queue, Stream } from "effect"
import { Mount } from "foldkit"

import { MeasuredHighlights } from "./message.ts"
import { HighlightRect, TargetRect } from "./model.ts"

// Padding the original applies around the unioned token rects
// (VisualEffectCodeSnippet.tsx: `x - 8, y - 6, width + 16, height + 12`).
const PAD_X = 8
const PAD_Y = 6

// The attribute the view stamps on each token span, listing every highlight
// target that token belongs to.
export const TARGETS_ATTRIBUTE = "targets"

const union = (
    container: Element,
    spans: ReadonlyArray<HTMLElement>
): HighlightRect | undefined => {
    const first = spans[0]

    if (first === undefined) {
        return undefined
    }

    let { left, top, right, bottom } = first.getBoundingClientRect()

    for (const span of spans.slice(1)) {
        const rect = span.getBoundingClientRect()

        left = Math.min(left, rect.left)
        top = Math.min(top, rect.top)
        right = Math.max(right, rect.right)
        bottom = Math.max(bottom, rect.bottom)
    }

    const box = container.getBoundingClientRect()

    return HighlightRect.make({
        x: left - box.left - PAD_X,
        y: top - box.top - PAD_Y,
        width: right - left + PAD_X * 2,
        height: bottom - top + PAD_Y * 2,
    })
}

// PORT NOTE: this used to take the result range as Mount args and measure just
// that one box. A Mount captures its args at mount time and Foldkit gives it no
// update hook, so the range could never follow a hovered step — and, navigating
// between examples, it kept measuring the previous example's offsets against
// the new snippet. Reading the targets off the DOM instead means the view stays
// the single source of truth and every target is measured at once.
const measure_all = (container: Element): ReadonlyArray<TargetRect> => {
    const by_target = new Map<string, Array<HTMLElement>>()

    for (const span of container.querySelectorAll<HTMLElement>(
        `span[data-${TARGETS_ATTRIBUTE}]`
    )) {
        for (const target of (span.dataset[TARGETS_ATTRIBUTE] ?? "").split(
            " "
        )) {
            if (target === "") {
                continue
            }

            const spans = by_target.get(target)

            if (spans === undefined) {
                by_target.set(target, [span])
            } else {
                spans.push(span)
            }
        }
    }

    const measured: Array<TargetRect> = []

    for (const [target, spans] of by_target) {
        const rect = union(container, spans)

        if (rect !== undefined) {
            measured.push(TargetRect.make({ target, rect }))
        }
    }

    return measured
}

// A stream, not a one-shot Effect: the boxes have to be re-measured whenever
// the code block resizes, which is what the original's ResizeObserver does. The
// alternative — computing offsets in `ch` — only holds while the font is
// monospace and no line ever wraps.
export const MeasureHighlight = Mount.defineStream("MeasureHighlight", {
    messages: [MeasuredHighlights],
    execute: ({ element }) =>
        Stream.callback<typeof MeasuredHighlights.Type>((queue) =>
            Effect.acquireRelease(
                Effect.sync(() => {
                    const emit = () => {
                        const rects = measure_all(element)

                        if (rects.length > 0) {
                            Queue.offerUnsafe(
                                queue,
                                MeasuredHighlights({ rects })
                            )
                        }
                    }

                    const schedule = () =>
                        globalThis.requestAnimationFrame(emit)
                    const resize = new ResizeObserver(schedule)

                    // A ResizeObserver alone is not enough. The first render uses
                    // the unhighlighted fallback — one span covering the whole
                    // line — and Shiki's tokens replace it milliseconds later
                    // without changing the block's size, so the box would stay
                    // stretched across the entire line. The same hook now also
                    // catches the snippet changing when the route does.
                    const mutation = new MutationObserver(schedule)

                    resize.observe(element)
                    mutation.observe(element, {
                        childList: true,
                        subtree: true,
                        characterData: true,
                        attributes: true,
                        attributeFilter: [`data-${TARGETS_ATTRIBUTE}`],
                    })
                    schedule()

                    return { resize, mutation }
                }),
                ({ resize, mutation }) =>
                    Effect.sync(() => {
                        resize.disconnect()
                        mutation.disconnect()
                    })
            ).pipe(Effect.flatMap(() => Effect.never))
        ),
})
