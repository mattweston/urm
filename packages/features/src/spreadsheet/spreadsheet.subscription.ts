import { Effect, Option, Queue, Stream } from "effect"
import { Subscription } from "foldkit"
import { VirtualList } from "@foldkit/ui"
import {
    GotRowsMessage,
    ScrolledColumns,
    type Message,
} from "./spreadsheet.message.ts"
import type { Model } from "./spreadsheet.model.ts"

const GRID_ID = "foldkit-spreadsheet-rows"

const rows = Subscription.lift({
    spreadsheetRows: VirtualList.subscriptions.containerEvents,
})<Model, Message>({
    read: (model) => Option.some(model.rows),
    toParentMessage: (message) => GotRowsMessage({ message }),
})

const columns = Subscription.make<Model, Message>()((entry) => ({
    spreadsheetColumns: entry(
        {},
        {
            modelToDependencies: () => ({}),
            dependenciesToStream: () =>
                Stream.callback<Message>((queue) =>
                    Effect.acquireRelease(
                        Effect.sync(() => {
                            let observedElement: HTMLElement | undefined
                            let resizeObserver: ResizeObserver | undefined
                            const publish = (element: HTMLElement) =>
                                Queue.offerUnsafe(
                                    queue,
                                    ScrolledColumns({
                                        scrollLeft: element.scrollLeft,
                                        viewportWidth: element.clientWidth,
                                    })
                                )
                            const onScroll = () => {
                                if (observedElement !== undefined) {
                                    publish(observedElement)
                                }
                            }
                            const detach = () => {
                                if (observedElement !== undefined) {
                                    observedElement.removeEventListener(
                                        "scroll",
                                        onScroll
                                    )
                                }
                                resizeObserver?.disconnect()
                                observedElement = undefined
                                resizeObserver = undefined
                            }
                            const attach = () => {
                                const element = document.getElementById(GRID_ID)
                                if (element === observedElement) {
                                    return
                                }
                                detach()
                                if (element === null) {
                                    return
                                }
                                observedElement = element
                                element.addEventListener("scroll", onScroll, {
                                    passive: true,
                                })
                                resizeObserver = new ResizeObserver(() =>
                                    publish(element)
                                )
                                resizeObserver.observe(element)
                                publish(element)
                            }
                            attach()
                            const mutationObserver = new MutationObserver(
                                attach
                            )
                            mutationObserver.observe(document.body, {
                                childList: true,
                                subtree: true,
                            })
                            return { detach, mutationObserver }
                        }),
                        ({ detach, mutationObserver }) =>
                            Effect.sync(() => {
                                mutationObserver.disconnect()
                                detach()
                            })
                    ).pipe(Effect.flatMap(() => Effect.never))
                ),
        }
    ),
}))

export const subscriptions = Subscription.aggregate<Model, Message>()(
    rows,
    columns
)
