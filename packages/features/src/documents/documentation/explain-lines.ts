import { Effect, Schema as S } from "effect"
import { Mount } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { taggedStruct } from "foldkit/schema"

import * as CodeLines from "./code-lines.ts"
export { MountCodeLines, CompletedMountCodeLines } from "./code-lines.ts"

export const CompletedMountExplainLines = taggedStruct(
    "CompletedMountExplainLines"
)
export const Message = S.Union([CompletedMountExplainLines, CodeLines.Message])
export type Message = typeof Message.Type

const explanation_selector = "[data-line-explanation-source]"

export const MountExplainLines = Mount.define("MountExplainLines", {
    messages: [CompletedMountExplainLines],
    execute: ({ element }) =>
        Effect.acquireRelease(
            Effect.sync(() => {
                const sources = Array.from(
                    element.querySelectorAll<HTMLElement>(explanation_selector)
                )
                const lines = Array.from(
                    element.querySelectorAll<HTMLElement>(".line")
                )

                sources.forEach((source) => {
                    const line_number = Number(source.dataset.explanationLine)
                    const line = lines[line_number - 1]
                    if (line === undefined) {
                        return
                    }

                    const explanation_id = `documentation-line-explanation-${line_number}`
                    line.dataset.annotated = "true"
                    line.setAttribute("aria-expanded", "false")
                    line.setAttribute("aria-controls", explanation_id)
                })

                const selected_line = (event: Event): void => {
                    if (!(event instanceof CustomEvent)) {
                        return
                    }
                    const detail: unknown = event.detail
                    if (
                        typeof detail !== "object" ||
                        detail === null ||
                        !("line" in detail) ||
                        typeof detail.line !== "number"
                    ) {
                        return
                    }

                    const line_number = detail.line
                    const line = lines[line_number - 1]
                    const source = sources.find(
                        (candidate) =>
                            Number(candidate.dataset.explanationLine) ===
                            line_number
                    )
                    if (line === undefined || source === undefined) {
                        return
                    }

                    const explanation_id = `documentation-line-explanation-${line_number}`
                    const existing = element.querySelector<HTMLElement>(
                        `#${explanation_id}`
                    )
                    if (existing !== null) {
                        existing.remove()
                        line.setAttribute("aria-expanded", "false")
                        return
                    }

                    const explanation = document.createElement("span")
                    explanation.id = explanation_id
                    explanation.className = "documentation-line-explanation"
                    explanation.setAttribute("role", "region")
                    explanation.setAttribute(
                        "aria-label",
                        source.dataset.explanationTitle ??
                            `Explanation for line ${line_number}`
                    )
                    explanation.innerHTML = source.innerHTML
                    line.after(explanation)
                    line.setAttribute("aria-expanded", "true")
                }

                element.addEventListener("line-select", selected_line)

                return {
                    message: CompletedMountExplainLines(),
                    cleanup: (): void => {
                        element.removeEventListener(
                            "line-select",
                            selected_line
                        )
                        element
                            .querySelectorAll<HTMLElement>(
                                ".documentation-line-explanation"
                            )
                            .forEach((explanation) => explanation.remove())
                        lines.forEach((line) => {
                            delete line.dataset.annotated
                            line.removeAttribute("aria-expanded")
                            line.removeAttribute("aria-controls")
                        })
                    },
                }
            }),
            ({ cleanup }) => Effect.sync(cleanup)
        ).pipe(Effect.map(({ message }) => message)),
})

export const view = <ParentMessage>(
    content: ReadonlyArray<Html>,
    to_parent_message: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class("documentation-explain-lines"),
            h.OnMount(Mount.mapMessage(MountExplainLines(), to_parent_message)),
        ],
        [CodeLines.view(content, true, false, to_parent_message, h)]
    )
