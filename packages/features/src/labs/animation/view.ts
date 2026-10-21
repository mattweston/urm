/** # Animation view */
import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

const triggerClassName =
    "px-4 py-2 text-base cursor-pointer transition rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border [font-family:var(--control-font-family)] [font-weight:var(--control-font-weight)] [letter-spacing:var(--control-letter-spacing)] [text-transform:var(--control-text-transform)] bg-background text-foreground [box-shadow:var(--shadow-control)] hover:bg-accent hover:text-accent-foreground hover:[box-shadow:var(--shadow-control-hover)] select-none"

const contentClassName =
    "rounded-[var(--radius-surface)] bg-muted border-(length:--surface-border-width) border-border p-4 transition duration-200 ease-out data-[closed]:opacity-0 data-[closed]:scale-95 data-[closed]:-translate-y-2"

/**
 * Toggle the example to compare entering and leaving states. Visibility changes
 * update the parent model while the animation submodel owns transition phases
 * and completion messages.
 */
export const view = <ParentMessage>(
    animationModel: Ui.Animation.Model,
    isShowing: boolean,
    toggle: () => ParentMessage,
    toAnimationMessage: (message: Ui.Animation.Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [],
        [
            h.h2(
                [h.Class("text-2xl font-bold text-foreground mb-6")],
                ["Animation"]
            ),
            h.div(
                [h.Class("flex gap-3")],
                [
                    h.button(
                        [h.Class(triggerClassName), h.OnClick(toggle())],
                        [isShowing ? "Hide Content" : "Show Content"]
                    ),
                ]
            ),
            h.div(
                [h.Class("mt-4")],
                [
                    h.submodel({
                        slotId: animationModel.id,
                        model: animationModel,
                        view: Ui.Animation.view,
                        viewInputs: {
                            content: h.p(
                                [h.Class("text-foreground")],
                                [
                                    "This content smoothly animates in and out. The Animation component coordinates CSS enter/leave lifecycles via data attributes, while animateSize uses a CSS grid wrapper for smooth height animation.",
                                ]
                            ),
                            className: contentClassName,
                            animateSize: true,
                        },
                        toParentMessage: toAnimationMessage,
                    }),
                ]
            ),
        ]
    )
}
