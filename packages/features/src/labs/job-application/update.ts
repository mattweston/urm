import { Array, Effect, Match as M, Option, pipe } from "effect"
import { Calendar, Command } from "foldkit"
import * as Ui from "@foldkit/ui"
import { modifyFields } from "foldkit/struct"

import { SubmitApplication } from "./command.ts"
import { Step as StepSchema } from "./domain/step.ts"
import {
    GotAttachmentsMessage,
    GotCoverLetterMessage,
    GotEducationMessage,
    GotPersonalInfoMessage,
    GotSkillsMessage,
    GotStepMenuMessage,
    GotWorkHistoryMessage,
    type Message,
} from "./message.ts"
import {
    type Model,
    SubmitError,
    SubmitSuccess,
    Submitting,
    NotSubmitted,
} from "./model.ts"
import * as Attachments from "./step/attachments.ts"
import * as CoverLetter from "./step/coverLetter.ts"
import * as Education from "./step/education/education.ts"
import * as PersonalInfo from "./step/personalInfo.ts"
import * as Skills from "./step/skills/skills.ts"
import * as WorkHistory from "./step/workHistory/workHistory.ts"

type Step = typeof StepSchema.Type

const StepMenu = Ui.Menu.create<Step>()

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const nextStep = (current: Step): Step =>
    pipe(
        StepSchema.literals,
        Array.get(StepSchema.literals.indexOf(current) + 1),
        Option.getOrElse(() => current)
    )

const previousStep = (current: Step): Step =>
    pipe(
        StepSchema.literals,
        Array.get(StepSchema.literals.indexOf(current) - 1),
        Option.getOrElse(() => current)
    )

export const init = (): UpdateReturn => {
    const today = Effect.runSync(Calendar.today.local)

    return [
        {
            currentStep: "PersonalInfo",
            personalInfo: PersonalInfo.init(today),
            workHistory: WorkHistory.init(today, "work-history-entry-1"),
            education: Education.init(today, "education-entry-1"),
            skills: Skills.init("skills-entry-1"),
            coverLetter: CoverLetter.init(),
            attachments: Attachments.init(),
            isPreviewVisible: false,
            submission: NotSubmitted(),
            stepMenu: Ui.Menu.init({ id: "step-menu" }),
        },
        [],
    ]
}

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            GotPersonalInfoMessage: ({ message: stepMessage }) => {
                const [nextPersonalInfo, commands] = PersonalInfo.update(
                    model.personalInfo,
                    stepMessage
                )

                return [
                    modifyFields(model, { personalInfo: () => nextPersonalInfo }),
                    commands.map(
                        Command.mapEffect(
                            Effect.map((message) =>
                                GotPersonalInfoMessage({ message })
                            )
                        )
                    ),
                ]
            },

            GotWorkHistoryMessage: ({ message: stepMessage }) => {
                const [nextWorkHistory, commands] = WorkHistory.update(
                    model.workHistory,
                    stepMessage
                )

                return [
                    modifyFields(model, { workHistory: () => nextWorkHistory }),
                    commands.map(
                        Command.mapEffect(
                            Effect.map((message) =>
                                GotWorkHistoryMessage({ message })
                            )
                        )
                    ),
                ]
            },

            GotEducationMessage: ({ message: stepMessage }) => {
                const [nextEducation, commands] = Education.update(
                    model.education,
                    stepMessage
                )

                return [
                    modifyFields(model, { education: () => nextEducation }),
                    commands.map(
                        Command.mapEffect(
                            Effect.map((message) =>
                                GotEducationMessage({ message })
                            )
                        )
                    ),
                ]
            },

            GotSkillsMessage: ({ message: stepMessage }) => {
                const [nextSkills, commands] = Skills.update(
                    model.skills,
                    stepMessage
                )

                return [
                    modifyFields(model, { skills: () => nextSkills }),
                    commands.map(
                        Command.mapEffect(
                            Effect.map((message) =>
                                GotSkillsMessage({ message })
                            )
                        )
                    ),
                ]
            },

            GotCoverLetterMessage: ({ message: stepMessage }) => {
                const [nextCoverLetter, commands] = CoverLetter.update(
                    model.coverLetter,
                    stepMessage
                )

                return [
                    modifyFields(model, { coverLetter: () => nextCoverLetter }),
                    commands.map(
                        Command.mapEffect(
                            Effect.map((message) =>
                                GotCoverLetterMessage({ message })
                            )
                        )
                    ),
                ]
            },

            GotAttachmentsMessage: ({ message: stepMessage }) => {
                const [nextAttachments, commands] = Attachments.update(
                    model.attachments,
                    stepMessage
                )

                return [
                    modifyFields(model, { attachments: () => nextAttachments }),
                    commands.map(
                        Command.mapEffect(
                            Effect.map((message) =>
                                GotAttachmentsMessage({ message })
                            )
                        )
                    ),
                ]
            },

            GotStepMenuMessage: ({ message: menuMessage }) => {
                const {
                    model: nextStepMenu,
                    commands = [],
                    outMessage: maybeOutMessage_value,
                } = StepMenu.update(model.stepMenu, menuMessage)
                const maybeOutMessage = Option.fromUndefinedOr(
                    maybeOutMessage_value
                )

                const nextStep = Option.match(maybeOutMessage, {
                    onNone: () => model.currentStep,
                    onSome: ({ value }) => value,
                })

                return [
                    modifyFields(model, {
                        currentStep: () => nextStep,
                        stepMenu: () => nextStepMenu,
                    }),
                    commands.map(
                        Command.mapEffect(
                            Effect.map((message) =>
                                GotStepMenuMessage({ message })
                            )
                        )
                    ),
                ]
            },

            NavigatedToStep: ({ step }) => [
                modifyFields(model, { currentStep: () => step }),
                [],
            ],

            ClickedNext: () => [
                modifyFields(model, { currentStep: () => nextStep(model.currentStep) }),
                [],
            ],

            ClickedPrevious: () => [
                modifyFields(model, {
                    currentStep: () => previousStep(model.currentStep),
                }),
                [],
            ],

            ToggledPreview: () => [
                modifyFields(model, { isPreviewVisible: (isVisible) => !isVisible }),
                [],
            ],

            SubmittedApplication: () => [
                modifyFields(model, { submission: () => Submitting() }),
                [SubmitApplication()],
            ],

            SucceededSubmitApplication: () => [
                modifyFields(model, { submission: () => SubmitSuccess() }),
                [],
            ],

            FailedSubmitApplication: ({ error }) => [
                modifyFields(model, { submission: () => SubmitError({ error }) }),
                [],
            ],
        })
    )
