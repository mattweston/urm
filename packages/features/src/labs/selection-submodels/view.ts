/** # Selection Submodels view */
import { Option } from "effect"
import * as Ui from "@foldkit/ui"
import { childAttributes } from "foldkit/html"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Icon from "../_shared/icon.ts"
import {
    ClickedClearSelectionSubmodelsPlan,
    GotSelectionSubmodelsListboxMessage,
    RestoredSelectionSubmodelsPlan,
    type SelectionSubmodelsMessage,
} from "./message.ts"
import { PLANS, type Plan } from "./plan.ts"

// The type argument is fixed once, here, and flows into both the view inputs
// and the OutMessage. That is the whole point of the factory.
const PlanListbox = Ui.Listbox.create<Plan>()

const LISTBOX_ANCHOR = {
    placement: "bottom-start" as const,
    gap: 4,
    padding: 8,
}

const triggerClassName =
    "inline-flex items-center justify-between gap-2 min-w-48 px-4 py-2 text-base font-normal cursor-pointer transition rounded-[var(--radius-control)] border-(length:--field-border-width) border-input bg-background text-foreground hover:bg-accent select-none [box-shadow:var(--shadow-control)]"

const itemsClassName =
    "absolute mt-1 w-56 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-overlay)] overflow-hidden z-10 outline-none"

const itemClassName =
    "group px-3 py-2 text-base text-muted-foreground cursor-pointer data-[active]:bg-accent data-[active]:text-accent-foreground border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"

const backdropClassName = "fixed inset-0 z-0"

const wrapperClassName = "relative inline-block"

const externalButtonClassName =
    "px-3 py-1.5 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border text-sm font-medium text-foreground transition hover:bg-muted"

const planListboxView = <ParentMessage>(
    listbox: Ui.Listbox.Model,
    maybeSelectedPlan: Option.Option<Plan>,
    toSelectionSubmodelsMessage: (
        message: SelectionSubmodelsMessage
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.submodel({
        slotId: listbox.id,
        model: listbox,
        view: PlanListbox.view,
        viewInputs: {
            // The committed selection is handed in from the parent. There is no
            // reflect helper for it, because the Listbox never held it.
            maybeSelectedValue: maybeSelectedPlan,
            anchor: LISTBOX_ANCHOR,
            items: PLANS,
            itemToConfig: (item) => ({
                className: itemClassName,
                content: h.div(
                    [h.Class("flex items-center gap-2")],
                    [
                        Icon.check(
                            "w-4 h-4 shrink-0 invisible group-data-[selected]:visible text-foreground"
                        ),
                        h.span([], [item]),
                    ]
                ),
            }),
            buttonContent: h.div(
                [h.Class("flex w-full items-center justify-between gap-4")],
                [
                    h.span(
                        [],
                        [
                            Option.getOrElse(
                                maybeSelectedPlan,
                                () => "Choose a plan"
                            ),
                        ]
                    ),
                    Icon.chevronDown("w-4 h-4"),
                ]
            ),
            buttonAttributes: childAttributes([h.Class(triggerClassName)]),
            itemsAttributes: childAttributes([h.Class(itemsClassName)]),
            backdropAttributes: childAttributes([h.Class(backdropClassName)]),
            attributes: childAttributes([h.Class(wrapperClassName)]),
        },
        toParentMessage: (message) =>
            toSelectionSubmodelsMessage(
                GotSelectionSubmodelsListboxMessage({ message })
            ),
    })

const ownedValueView = <ParentMessage>(
    maybeSelectedPlan: Option.Option<Plan>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 flex flex-col gap-1"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "text-xs uppercase tracking-wider text-muted-foreground"
                    ),
                ],
                ["Your Model"]
            ),
            h.code(
                [h.Class("font-mono text-sm text-foreground")],
                [
                    Option.match(maybeSelectedPlan, {
                        onNone: () => "maybeSelectedPlan: Option.none()",
                        onSome: (plan) =>
                            `maybeSelectedPlan: Option.some("${plan}")`,
                    }),
                ]
            ),
        ]
    )

const externalWriteView = <ParentMessage>(
    toSelectionSubmodelsMessage: (
        message: SelectionSubmodelsMessage
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("flex flex-wrap items-center gap-2")],
        [
            h.span(
                [h.Class("text-sm text-muted-foreground mr-1")],
                ["Write the selection from outside the Listbox:"]
            ),
            ...PLANS.map((plan) =>
                h.keyed("button")(
                    plan,
                    [
                        h.OnClick(
                            toSelectionSubmodelsMessage(
                                RestoredSelectionSubmodelsPlan({ plan })
                            )
                        ),
                        h.Class(externalButtonClassName),
                    ],
                    [plan]
                )
            ),
            h.button(
                [
                    h.OnClick(
                        toSelectionSubmodelsMessage(
                            ClickedClearSelectionSubmodelsPlan()
                        )
                    ),
                    h.Class(externalButtonClassName),
                ],
                ["Clear"]
            ),
        ]
    )

/**
 * Choose, restore, and clear a plan to see the boundary between listbox state
 * and selected domain data. The child submodel owns navigation and focus while
 * the parent model owns the selected plan.
 */
export const view = <ParentMessage>(
    listbox: Ui.Listbox.Model,
    maybeSelectedPlan: Option.Option<Plan>,
    toSelectionSubmodelsMessage: (
        message: SelectionSubmodelsMessage
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("flex flex-col gap-4")],
        [
            h.div(
                [h.Class("relative")],
                [
                    planListboxView(
                        listbox,
                        maybeSelectedPlan,
                        toSelectionSubmodelsMessage,
                        h
                    ),
                ]
            ),
            ownedValueView(maybeSelectedPlan, h),
            externalWriteView(toSelectionSubmodelsMessage, h),
        ]
    )
