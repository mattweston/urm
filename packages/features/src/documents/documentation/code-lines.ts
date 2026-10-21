import { Effect, Schema as S } from "effect"
import { Mount } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { taggedStruct } from "foldkit/schema"

export const CompletedMountCodeLines = taggedStruct("CompletedMountCodeLines")
export const Message = S.Union([CompletedMountCodeLines])
export type Message = typeof Message.Type

const line_elements = (element: Element): ReadonlyArray<HTMLElement> =>
    Array.from(element.querySelectorAll<HTMLElement>(".line"))

const lock_lines = (element: Element): void => {
    line_elements(element).forEach((line) => {
        delete line.dataset.line
        line.removeAttribute("role")
        line.removeAttribute("tabindex")
    })
}

export const MountCodeLines = Mount.define("MountCodeLines", {
    messages: [CompletedMountCodeLines],
    execute: ({ element }) =>
        Effect.acquireRelease(
            Effect.sync(() => {
                const listeners = line_elements(element).map((line, index) => {
                    const select = (): void => {
                        line_elements(element).forEach((candidate) => {
                            if (candidate === line) {
                                candidate.dataset.state = "active"
                                return
                            }
                            delete candidate.dataset.state
                        })
                        element.dispatchEvent(
                            new CustomEvent("line-select", {
                                detail: { line: index + 1 },
                                bubbles: true,
                            })
                        )
                        if (
                            element.getAttribute("data-lock-on-select") ===
                            "true"
                        ) {
                            lock_lines(element)
                        }
                    }
                    const pressed_key = (event: KeyboardEvent): void => {
                        if (event.key !== "Enter" && event.key !== " ") {
                            return
                        }
                        event.preventDefault()
                        select()
                    }

                    line.dataset.line = String(index + 1)
                    line.setAttribute("role", "button")
                    line.tabIndex = 0
                    line.addEventListener("click", select)
                    line.addEventListener("keydown", pressed_key)

                    return { line, clicked: select, pressed_key }
                })

                return {
                    message: CompletedMountCodeLines(),
                    cleanup: (): void => {
                        listeners.forEach(({ line, clicked, pressed_key }) => {
                            line.removeEventListener("click", clicked)
                            line.removeEventListener("keydown", pressed_key)
                            delete line.dataset.state
                        })
                    },
                }
            }),
            ({ cleanup }) => Effect.sync(cleanup)
        ).pipe(Effect.map(({ message }) => message)),
})

export const view = <ParentMessage>(
    content: ReadonlyArray<Html>,
    is_selectable: boolean,
    is_locked_after_selection: boolean,
    to_parent_message: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class("documentation-code-lines"),
            ...(is_selectable
                ? [
                      h.DataAttribute("selectable-lines", ""),
                      h.OnMount(
                          Mount.mapMessage(MountCodeLines(), to_parent_message)
                      ),
                  ]
                : []),
            ...(is_locked_after_selection
                ? [h.DataAttribute("lock-on-select", "true")]
                : []),
        ],
        content
    )
