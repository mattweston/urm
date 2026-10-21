import clsx from "clsx"
import { Equal, HashSet, Match, Number, flow } from "effect"
import * as Ui from "@foldkit/ui"
import { type Html, type HtmlBuilder } from "foldkit/html"

import * as Step from "../domain/step.ts"
import type { Model } from "../model.ts"
import { chevronDown } from "./icon.ts"

const Menu = Ui.Menu.create<Step.Step>()

type StepStatus = "Current" | "Completed" | "Upcoming"

const stepToStatus = (step: Step.Step, currentStep: Step.Step): StepStatus =>
    Match.value(step).pipe(
        Match.withReturnType<StepStatus>(),
        Match.when(Equal.equals(currentStep), () => "Current"),
        Match.when(
            flow(Step.indexOf, Number.isLessThan(Step.indexOf(currentStep))),
            () => "Completed"
        ),
        Match.orElse(() => "Upcoming")
    )

const isClickable = (status: StepStatus, hasErrors: boolean): boolean =>
    status !== "Upcoming" || hasErrors

const stepMarkerGlyph = (
    status: StepStatus,
    index: number,
    hasErrors: boolean
): string => {
    if (hasErrors) {
        return "!"
    }

    if (status === "Completed") {
        return "✓"
    }

    return String(Number.increment(index))
}

const stepMarker = <ParentMessage>(
    status: StepStatus,
    index: number,
    hasErrors: boolean,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.span(
        [
            h.Class(
                clsx(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                    hasErrors
                        ? "bg-destructive/10 text-destructive"
                        : Match.value(status).pipe(
                              Match.withReturnType<string>(),
                              Match.when(
                                  "Current",
                                  () => "bg-primary text-primary-foreground"
                              ),
                              Match.when(
                                  "Completed",
                                  () => "bg-accent text-accent-foreground"
                              ),
                              Match.when(
                                  "Upcoming",
                                  () => "bg-muted text-muted-foreground"
                              ),
                              Match.exhaustive
                          )
                )
            ),
        ],
        [stepMarkerGlyph(status, index, hasErrors)]
    )
}

const stepButtonClass = (status: StepStatus, hasErrors: boolean): string =>
    clsx(
        "flex w-full items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium transition",
        hasErrors
            ? "text-destructive hover:bg-destructive/10 cursor-pointer"
            : Match.value(status).pipe(
                  Match.withReturnType<string>(),
                  Match.when(
                      "Current",
                      () => "bg-accent text-accent-foreground"
                  ),
                  Match.when(
                      "Completed",
                      () =>
                          "text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
                  ),
                  Match.when(
                      "Upcoming",
                      () => "text-muted-foreground cursor-default"
                  ),
                  Match.exhaustive
              )
    )

export const stepList = <ParentMessage>(
    currentStep: Step.Step,
    stepsWithErrors: HashSet.HashSet<Step.Step>,
    onSelectedStep: (step: Step.Step) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.nav(
        [h.AriaLabel("Application steps"), h.Class("space-y-1")],
        [
            h.ul(
                [h.Class("space-y-0.5")],
                Step.all.map((step, index) => {
                    const status = stepToStatus(step, currentStep)
                    const hasErrors = HashSet.has(stepsWithErrors, step)
                    const clickable = isClickable(status, hasErrors)

                    return h.keyed("li")(
                        step,
                        [],
                        [
                            h.button(
                                [
                                    h.Type("button"),
                                    ...(status === "Current"
                                        ? [h.AriaCurrent("step")]
                                        : []),
                                    ...(clickable
                                        ? [h.OnClick(onSelectedStep(step))]
                                        : [h.AriaDisabled(true)]),
                                    h.Class(stepButtonClass(status, hasErrors)),
                                ],
                                [
                                    stepMarker<ParentMessage>(
                                        status,
                                        index,
                                        hasErrors,
                                        h
                                    ),
                                    h.span([], [Step.show(step)]),
                                ]
                            ),
                        ]
                    )
                })
            ),
        ]
    )
}

const stepMenuTrigger = <ParentMessage>(
    currentStep: Step.Step,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("flex items-center justify-between w-full gap-3")],
        [
            h.div(
                [h.Class("flex items-center gap-2 min-w-0")],
                [
                    h.span(
                        [
                            h.Class(
                                "text-xs font-medium text-muted-foreground shrink-0"
                            ),
                        ],
                        [
                            `Step ${Number.increment(Step.indexOf(currentStep))} of ${Step.all.length}`,
                        ]
                    ),
                    h.span(
                        [
                            h.Class(
                                "text-sm font-semibold text-foreground truncate"
                            ),
                        ],
                        [Step.show(currentStep)]
                    ),
                ]
            ),
            h.span(
                [h.Class("text-muted-foreground shrink-0")],
                [chevronDown()]
            ),
        ]
    )
}

export const stepMenu = <ParentMessage>(
    model: Model,
    stepsWithErrors: HashSet.HashSet<Step.Step>,
    toParentMessage: (message: Ui.Menu.Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.submodel({
        slotId: model.stepMenu.id,
        model: model.stepMenu,
        view: Menu.view,
        viewInputs: {
            items: Step.all,
            buttonContent: stepMenuTrigger<ParentMessage>(model.currentStep, h),
            buttonClassName:
                "flex items-center w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card px-4 py-3 text-left [box-shadow:var(--shadow-surface)] transition hover:border-border hover:bg-accent hover:text-accent-foreground cursor-pointer",
            itemsClassName:
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card [box-shadow:var(--shadow-overlay)] py-1 w-(--button-width)",
            itemToConfig: (step, { isActive, isDisabled }) => {
                const status = stepToStatus(step, model.currentStep)
                const hasErrors = HashSet.has(stepsWithErrors, step)
                const index = Step.indexOf(step)

                return {
                    className: clsx(
                        "flex items-center gap-3 px-4 py-2.5 text-sm",
                        isActive && "bg-accent",
                        isDisabled ? "cursor-not-allowed" : "cursor-pointer",
                        hasErrors
                            ? "text-destructive font-semibold"
                            : Match.value(status).pipe(
                                  Match.withReturnType<string>(),
                                  Match.when(
                                      "Current",
                                      () => "text-primary font-semibold"
                                  ),
                                  Match.when(
                                      "Completed",
                                      () => "text-foreground"
                                  ),
                                  Match.when(
                                      "Upcoming",
                                      () => "text-muted-foreground"
                                  ),
                                  Match.exhaustive
                              )
                    ),
                    content: h.div(
                        [h.Class("flex items-center gap-3")],
                        [
                            stepMarker<ParentMessage>(
                                status,
                                index,
                                hasErrors,
                                h
                            ),
                            h.span([], [Step.show(step)]),
                        ]
                    ),
                }
            },
            isItemDisabled: (step) =>
                !isClickable(
                    stepToStatus(step, model.currentStep),
                    HashSet.has(stepsWithErrors, step)
                ),
            backdropClassName: "fixed inset-0",
            anchor: { placement: "bottom-start", gap: 4, padding: 8 },
        },
        toParentMessage,
    })
}
