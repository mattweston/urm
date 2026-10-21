import { Cause, Effect, Queue, Stream } from "effect"
import { Mount } from "foldkit"

import {
    CancelledDragging,
    DraggedTo,
    EndedDragging,
    Message,
    StartedDragging,
} from "./message.ts"

const scene_point = (
    svg: SVGSVGElement,
    event: PointerEvent
): Readonly<{ x: number; y: number }> | undefined => {
    const matrix = svg.getScreenCTM()
    if (matrix === null) return undefined
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
        matrix.inverse()
    )
    return { x: point.x, y: point.y }
}

const element_id = (event: PointerEvent): string | undefined => {
    const target = event.target
    if (!(target instanceof Element)) return undefined
    return (
        target
            .closest("[data-logo-element]")
            ?.getAttribute("data-logo-element") ?? undefined
    )
}

const listen = (
    element: Element,
    queue: Queue.Queue<Message, Cause.Done>
): (() => void) => {
    if (!(element instanceof SVGSVGElement)) return () => undefined

    let active_pointer: number | undefined

    const finish = (message: Message) => {
        if (active_pointer === undefined) return
        if (element.hasPointerCapture(active_pointer)) {
            element.releasePointerCapture(active_pointer)
        }
        active_pointer = undefined
        Queue.offerUnsafe(queue, message)
    }

    const pointer_down = (event: PointerEvent) => {
        if (event.button !== 0) return
        const id = element_id(event)
        const point = scene_point(element, event)
        if (id === undefined || point === undefined) return

        event.preventDefault()
        active_pointer = event.pointerId
        element.setPointerCapture(event.pointerId)
        Queue.offerUnsafe(queue, StartedDragging({ id, point }))
    }

    const pointer_move = (event: PointerEvent) => {
        if (event.pointerId !== active_pointer) return
        const point = scene_point(element, event)
        if (point !== undefined) {
            Queue.offerUnsafe(
                queue,
                DraggedTo({ point, bypass_snap: event.altKey })
            )
        }
    }

    const pointer_up = (event: PointerEvent) => {
        if (event.pointerId === active_pointer) finish(EndedDragging())
    }

    const pointer_cancel = (event: PointerEvent) => {
        if (event.pointerId === active_pointer) finish(CancelledDragging())
    }

    element.addEventListener("pointerdown", pointer_down)
    element.addEventListener("pointermove", pointer_move)
    element.addEventListener("pointerup", pointer_up)
    element.addEventListener("pointercancel", pointer_cancel)

    return () => {
        if (
            active_pointer !== undefined &&
            element.hasPointerCapture(active_pointer)
        ) {
            element.releasePointerCapture(active_pointer)
        }
        element.removeEventListener("pointerdown", pointer_down)
        element.removeEventListener("pointermove", pointer_move)
        element.removeEventListener("pointerup", pointer_up)
        element.removeEventListener("pointercancel", pointer_cancel)
    }
}

export const LogoPointer = Mount.defineStream("LogoDesignerPointer", {
    messages: [Message],
    execute: ({ element }) =>
        Stream.callback<Message>((queue) =>
            Effect.scoped(
                Effect.gen(function* () {
                    yield* Effect.acquireRelease(
                        Effect.sync(() => listen(element, queue)),
                        (stop) => Effect.sync(() => stop())
                    )
                    return yield* Effect.never
                })
            )
        ),
})
