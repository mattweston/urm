import clsx from "clsx"
import { Array, Equal, HashSet, Match as M, Option, pipe } from "effect"
import { type Html, type HtmlBuilder } from "foldkit/html"

import * as Step from "../domain/step.ts"
import {
    ClickedNext,
    ClickedPrevious,
    GotAttachmentsMessage,
    GotCoverLetterMessage,
    GotEducationMessage,
    GotPersonalInfoMessage,
    GotSkillsMessage,
    GotStepMenuMessage,
    GotWorkHistoryMessage,
    Message,
    NavigatedToStep,
    SubmittedApplication,
    ToggledPreview,
} from "../message.ts"
import type { Model } from "../model.ts"
import * as Education from "../step/education/education.ts"
import * as PersonalInfo from "../step/personalInfo.ts"
import * as Skills from "../step/skills/skills.ts"
import * as WorkHistory from "../step/workHistory/workHistory.ts"
import { attachmentsView } from "./attachments.ts"
import { coverLetterView } from "./coverLetter.ts"
import { educationView } from "./education.ts"
import { personalInfoView } from "./personalInfo.ts"
import { preview } from "./preview.ts"
import { review } from "./review.ts"
import { skillsView } from "./skills.ts"
import { stepList, stepMenu } from "./stepNav.ts"
import { workHistoryView } from "./workHistory.ts"

const stepHasErrors =
    (model: Model) =>
    (step: Step.Step): boolean =>
        M.value(step).pipe(
            M.when("PersonalInfo", () =>
                PersonalInfo.hasErrors(model.personalInfo)
            ),
            M.when("WorkHistory", () =>
                WorkHistory.hasErrors(model.workHistory)
            ),
            M.when("Education", () => Education.hasErrors(model.education)),
            M.when("Skills", () => Skills.hasErrors(model.skills)),
            M.orElse(() => false)
        )

const stepsWithErrors = (model: Model): HashSet.HashSet<Step.Step> =>
    pipe(Step.all, Array.filter(stepHasErrors(model)), HashSet.fromIterable)

const stepContent = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return M.value(model.currentStep).pipe(
        M.when("PersonalInfo", () =>
            personalInfoView<ParentMessage>(
                model.personalInfo,
                (message) =>
                    toParentMessage(GotPersonalInfoMessage({ message })),
                h
            )
        ),
        M.when("WorkHistory", () =>
            workHistoryView<ParentMessage>(
                model.workHistory,
                (message) =>
                    toParentMessage(GotWorkHistoryMessage({ message })),
                h
            )
        ),
        M.when("Education", () =>
            educationView<ParentMessage>(
                model.education,
                (message) => toParentMessage(GotEducationMessage({ message })),
                h
            )
        ),
        M.when("Skills", () =>
            skillsView<ParentMessage>(
                model.skills,
                (message) => toParentMessage(GotSkillsMessage({ message })),
                h
            )
        ),
        M.when("CoverLetter", () =>
            coverLetterView<ParentMessage>(
                model.coverLetter,
                (message) =>
                    toParentMessage(GotCoverLetterMessage({ message })),
                h
            )
        ),
        M.when("Attachments", () =>
            attachmentsView<ParentMessage>(
                model.attachments,
                (message) =>
                    toParentMessage(GotAttachmentsMessage({ message })),
                h
            )
        ),
        M.when("Review", () =>
            review<ParentMessage>(
                model,
                toParentMessage(SubmittedApplication()),
                h
            )
        ),
        M.exhaustive
    )
}

const isFirstStep = (model: Model): boolean =>
    pipe(Step.all, Array.head, Option.exists(Equal.equals(model.currentStep)))

const isLastStep = (model: Model): boolean =>
    pipe(Step.all, Array.last, Option.exists(Equal.equals(model.currentStep)))

const navigationButtons = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.keyed("div")(
        "navigation",
        [
            h.Class(
                "flex justify-between pt-6 mt-8 border-t-(length:--surface-border-width) border-border"
            ),
        ],
        [
            ...(isFirstStep(model)
                ? [h.empty]
                : [
                      h.keyed("button")(
                          "previous",
                          [
                              h.Type("button"),
                              h.OnClick(toParentMessage(ClickedPrevious())),
                              h.Class(
                                  "rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition cursor-pointer [box-shadow:var(--shadow-control)]"
                              ),
                          ],
                          ["← Previous"]
                      ),
                  ]),
            ...(isLastStep(model)
                ? []
                : [
                      h.keyed("button")(
                          "next",
                          [
                              h.Type("button"),
                              h.OnClick(toParentMessage(ClickedNext())),
                              h.Class(
                                  "rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition cursor-pointer border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                              ),
                          ],
                          ["Next →"]
                      ),
                  ]),
        ]
    )
}

const pageHeader = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html => {
    return h.div(
        [h.Class("mb-6")],
        [
            h.h1(
                [h.Class("text-2xl font-bold text-foreground")],
                ["Apply to Work on Foldkit"]
            ),
            h.p(
                [h.Class("text-sm text-muted-foreground mt-1")],
                [
                    "Fill out the form below and watch your resume build in real time.",
                ]
            ),
        ]
    )
}

const stepContentPanel = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.keyed("div")(
        "step-content-panel",
        [h.Class("flex-1 min-w-0")],
        [
            h.keyed("h2")(
                "step-heading",
                [h.Class("text-lg font-semibold text-foreground mb-6")],
                [Step.show(model.currentStep)]
            ),
            h.keyed("div")(
                `step-content-${model.currentStep}`,
                [h.Class("min-h-[400px]")],
                [stepContent<ParentMessage>(model, toParentMessage, h)]
            ),
            ...(model.currentStep !== "Review"
                ? [navigationButtons<ParentMessage>(model, toParentMessage, h)]
                : []),
        ]
    )
}

const desktopStepSidebar = <ParentMessage>(
    model: Model,
    errorSteps: HashSet.HashSet<Step.Step>,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.keyed("div")(
        "desktop-sidebar",
        [h.Class("hidden w-60 shrink-0 lg:block")],
        [
            h.div(
                [h.Class("sticky top-8")],
                [
                    stepList<ParentMessage>(
                        model.currentStep,
                        errorSteps,
                        (step) => toParentMessage(NavigatedToStep({ step })),
                        h
                    ),
                ]
            ),
        ]
    )
}

const desktopPreviewSidebar = <ParentMessage>(
    model: Model,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.keyed("div")(
        "desktop-preview",
        [h.Class("hidden w-80 shrink-0 xl:block")],
        [
            h.div(
                [h.Class("sticky top-8")],
                [
                    h.div(
                        [h.Class("mb-2 flex items-center justify-between")],
                        [
                            h.h2(
                                [
                                    h.Class(
                                        "text-sm font-semibold text-foreground"
                                    ),
                                ],
                                ["Live Preview"]
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6 text-card-foreground [box-shadow:var(--shadow-surface)]"
                            ),
                        ],
                        [preview<ParentMessage>(model, h)]
                    ),
                ]
            ),
        ]
    )
}

const mobilePreviewToggle = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.keyed("div")(
        "mobile-toggle",
        [h.Class("fixed bottom-4 right-4 xl:hidden")],
        [
            h.button(
                [
                    h.Type("button"),
                    h.OnClick(toParentMessage(ToggledPreview())),
                    h.Class(
                        clsx(
                            "rounded-full px-4 py-2 text-sm font-medium [box-shadow:var(--shadow-overlay)] transition cursor-pointer",
                            model.isPreviewVisible
                                ? "bg-card text-foreground hover:bg-accent hover:text-accent-foreground"
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                        )
                    ),
                ],
                [model.isPreviewVisible ? "Hide Preview" : "Preview"]
            ),
        ]
    )
}

const mobilePreviewOverlay = <ParentMessage>(
    model: Model,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.keyed("div")(
        "mobile-overlay",
        [
            h.Class(
                "fixed inset-x-4 bottom-16 top-4 overflow-y-auto rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6 text-card-foreground [box-shadow:var(--shadow-overlay)] xl:hidden"
            ),
        ],
        [preview<ParentMessage>(model, h)]
    )
}

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const errorSteps = stepsWithErrors(model)

    return h.div(
        [h.Class("min-h-screen bg-background")],
        [
            h.div(
                [h.Class("mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8")],
                [
                    pageHeader<ParentMessage>(h),
                    h.div(
                        [h.Class("mb-6 lg:hidden")],
                        [
                            stepMenu<ParentMessage>(
                                model,
                                errorSteps,
                                (message) =>
                                    toParentMessage(
                                        GotStepMenuMessage({ message })
                                    ),
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("lg:flex lg:gap-8")],
                        [
                            desktopStepSidebar<ParentMessage>(
                                model,
                                errorSteps,
                                toParentMessage,
                                h
                            ),
                            stepContentPanel<ParentMessage>(
                                model,
                                toParentMessage,
                                h
                            ),
                            desktopPreviewSidebar<ParentMessage>(model, h),
                            mobilePreviewToggle<ParentMessage>(
                                model,
                                toParentMessage,
                                h
                            ),
                            ...(model.isPreviewVisible
                                ? [
                                      mobilePreviewOverlay<ParentMessage>(
                                          model,
                                          h
                                      ),
                                  ]
                                : []),
                        ]
                    ),
                ]
            ),
        ]
    )
}
