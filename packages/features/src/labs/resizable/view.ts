/** # Resizable view */
import { Effect, Function } from "effect"
import { Mount } from "foldkit"
import { type Html, type HtmlBuilder } from "foldkit/html"

import {
    Resizable,
    ResizableHandle,
    ResizablePanel,
} from "@urm/ui/foldkit/resizable.view.ts"
import type { Message as ResizableMessage } from "./resizable.message.ts"
import { CompletedResizableMount } from "./resizable.message.ts"

const clamp = (value: number, minimum: number, maximum: number) =>
    Math.min(Math.max(value, minimum), maximum)

const MountResizable = Mount.define("MountResizable", {
    messages: [CompletedResizableMount],
    execute: ({ element }) => {
        if (!(element instanceof HTMLElement)) {
            return Effect.acquireRelease(
                Effect.succeed(CompletedResizableMount()),
                () => Effect.sync(() => undefined)
            )
        }

        const setupResizableRoot = (resizableRoot: HTMLElement) => {
            const orientation =
                resizableRoot.dataset.orientation === "vertical"
                    ? "vertical"
                    : "horizontal"
            const isVertical = orientation === "vertical"
            const panelElements = Array.from(resizableRoot.children).filter(
                (child): child is HTMLElement =>
                    child instanceof HTMLElement &&
                    child.dataset.resizablePanel !== undefined
            )
            const handleElement = Array.from(resizableRoot.children).find(
                (child): child is HTMLElement =>
                    child instanceof HTMLElement &&
                    child.dataset.resizableHandle !== undefined
            )

            if (panelElements.length < 2 || handleElement === undefined) {
                return Function.constVoid
            }

            const firstPanel = panelElements[0]
            const secondPanel = panelElements[1]
            if (firstPanel === undefined || secondPanel === undefined) {
                return Function.constVoid
            }
            const firstMinimumSize = Number(
                firstPanel.dataset.minSize ?? "0.15"
            )
            const secondMinimumSize = Number(
                secondPanel.dataset.minSize ?? "0.15"
            )
            const initialFirstSize = Number(
                firstPanel.dataset.initialSize ?? "0.5"
            )

            let firstSize = clamp(
                initialFirstSize,
                firstMinimumSize,
                1 - secondMinimumSize
            )
            let secondSize = 1 - firstSize
            let maybePointerMove: ((event: PointerEvent) => void) | undefined
            let maybePointerUp: (() => void) | undefined

            const applySizes = () => {
                firstPanel.style.flexBasis = `${firstSize * 100}%`
                firstPanel.style.flexGrow = "0"
                firstPanel.style.flexShrink = "0"
                secondPanel.style.flexBasis = `${secondSize * 100}%`
                secondPanel.style.flexGrow = "0"
                secondPanel.style.flexShrink = "0"
            }

            const cleanupListeners = () => {
                if (maybePointerMove !== undefined) {
                    window.removeEventListener("pointermove", maybePointerMove)
                }
                if (maybePointerUp !== undefined) {
                    window.removeEventListener("pointerup", maybePointerUp)
                    window.removeEventListener("pointercancel", maybePointerUp)
                }
                maybePointerMove = undefined
                maybePointerUp = undefined
            }

            const handlePointerDown = (event: PointerEvent) => {
                if (event.button !== 0) {
                    return
                }

                cleanupListeners()

                const containerSize = isVertical
                    ? resizableRoot.getBoundingClientRect().height
                    : resizableRoot.getBoundingClientRect().width

                if (containerSize <= 0) {
                    return
                }

                event.preventDefault()

                const startPointerPosition = isVertical
                    ? event.clientY
                    : event.clientX
                const startFirstSize = firstSize

                maybePointerMove = (moveEvent: PointerEvent) => {
                    const currentPointerPosition = isVertical
                        ? moveEvent.clientY
                        : moveEvent.clientX
                    const nextFirstSize =
                        startFirstSize +
                        (currentPointerPosition - startPointerPosition) /
                            containerSize

                    firstSize = clamp(
                        nextFirstSize,
                        firstMinimumSize,
                        1 - secondMinimumSize
                    )
                    secondSize = 1 - firstSize
                    applySizes()
                }

                maybePointerUp = () => {
                    cleanupListeners()
                }

                window.addEventListener("pointermove", maybePointerMove)
                window.addEventListener("pointerup", maybePointerUp, {
                    once: true,
                })
                window.addEventListener("pointercancel", maybePointerUp, {
                    once: true,
                })
            }

            applySizes()
            handleElement.addEventListener("pointerdown", handlePointerDown)

            return () => {
                cleanupListeners()
                handleElement.removeEventListener(
                    "pointerdown",
                    handlePointerDown
                )
            }
        }

        return Effect.acquireRelease(
            Effect.sync(() =>
                Array.from(
                    element.querySelectorAll<HTMLElement>(
                        "[data-resizable-root]"
                    )
                ).map(setupResizableRoot)
            ),
            (cleanupResizables) =>
                Effect.sync(() => {
                    cleanupResizables.forEach((cleanup) => cleanup())
                })
        ).pipe(Effect.as(CompletedResizableMount()))
    },
})()

/**
 * Drag the outer and nested handles to resize the three panels. Pointer
 * listeners are acquired by the component mount and released when dragging ends
 * or the documentation page is left.
 */
export const view = <ParentMessage>(
    toParentMessage: (message: ResizableMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [],
        [
            h.h2(
                [h.Class("text-2xl font-bold text-foreground mb-6")],
                ["Resizable"]
            ),
            h.p(
                [h.Class("mb-6 max-w-2xl text-sm text-muted-foreground")],
                [
                    "A splitter layout with a draggable handle between two panels.",
                ]
            ),
            h.div(
                [
                    h.Class("flex justify-center"),
                    h.OnMount(
                        Mount.mapMessage(MountResizable, toParentMessage)
                    ),
                ],
                [
                    Resizable({
                        class: "max-w-md rounded-[var(--radius-surface)] border-(length:--surface-border-width) bg-card text-card-foreground [box-shadow:var(--shadow-surface)]",
                        children: [
                            ResizablePanel({
                                initialSize: 0.25,
                                class: "overflow-hidden",
                                children: [
                                    h.div(
                                        [
                                            h.Class(
                                                "flex h-[200px] items-center justify-center p-6"
                                            ),
                                        ],
                                        [
                                            h.span(
                                                [h.Class("font-semibold")],
                                                ["One"]
                                            ),
                                        ]
                                    ),
                                ],
                            }),
                            ResizableHandle({ withHandle: true }),
                            ResizablePanel({
                                initialSize: 0.75,
                                class: "overflow-hidden",
                                children: [
                                    Resizable({
                                        orientation: "vertical",
                                        class: "h-full",
                                        children: [
                                            ResizablePanel({
                                                initialSize: 0.5,
                                                class: "overflow-hidden",
                                                children: [
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "flex h-full items-center justify-center p-6"
                                                            ),
                                                        ],
                                                        [
                                                            h.span(
                                                                [
                                                                    h.Class(
                                                                        "font-semibold"
                                                                    ),
                                                                ],
                                                                ["Two"]
                                                            ),
                                                        ]
                                                    ),
                                                ],
                                            }),
                                            ResizableHandle({
                                                orientation: "vertical",
                                                withHandle: true,
                                            }),
                                            ResizablePanel({
                                                initialSize: 0.5,
                                                class: "overflow-hidden",
                                                children: [
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "flex h-full items-center justify-center p-6"
                                                            ),
                                                        ],
                                                        [
                                                            h.span(
                                                                [
                                                                    h.Class(
                                                                        "font-semibold"
                                                                    ),
                                                                ],
                                                                ["Three"]
                                                            ),
                                                        ]
                                                    ),
                                                ],
                                            }),
                                        ],
                                    }),
                                ],
                            }),
                        ],
                    }),
                ]
            ),
        ]
    )
}
