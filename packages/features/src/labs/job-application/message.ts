import { Schema as S } from "effect"
import * as Ui from "@foldkit/ui"
import { taggedStruct } from "foldkit/schema"

import { Step } from "./domain/step.ts"
import * as Attachments from "./step/attachments.ts"
import * as CoverLetter from "./step/coverLetter.ts"
import * as Education from "./step/education/education.ts"
import * as PersonalInfo from "./step/personalInfo.ts"
import * as Skills from "./step/skills/skills.ts"
import * as WorkHistory from "./step/workHistory/workHistory.ts"

// STEP SUBMODELS

export const GotPersonalInfoMessage = taggedStruct("GotPersonalInfoMessage", {
    message: PersonalInfo.Message,
})
export const GotWorkHistoryMessage = taggedStruct("GotWorkHistoryMessage", {
    message: WorkHistory.Message,
})
export const GotEducationMessage = taggedStruct("GotEducationMessage", {
    message: Education.Message,
})
export const GotSkillsMessage = taggedStruct("GotSkillsMessage", {
    message: Skills.Message,
})
export const GotCoverLetterMessage = taggedStruct("GotCoverLetterMessage", {
    message: CoverLetter.Message,
})
export const GotAttachmentsMessage = taggedStruct("GotAttachmentsMessage", {
    message: Attachments.Message,
})
export const GotStepMenuMessage = taggedStruct("GotStepMenuMessage", {
    message: Ui.Menu.Message,
})

// NAVIGATION

export const NavigatedToStep = taggedStruct("NavigatedToStep", { step: Step })
export const ClickedNext = taggedStruct("ClickedNext")
export const ClickedPrevious = taggedStruct("ClickedPrevious")

// PREVIEW

export const ToggledPreview = taggedStruct("ToggledPreview")

// SUBMISSION

export const SubmittedApplication = taggedStruct("SubmittedApplication")
export const SucceededSubmitApplication = taggedStruct(
    "SucceededSubmitApplication"
)
export const FailedSubmitApplication = taggedStruct("FailedSubmitApplication", {
    error: S.String,
})

// UNION

export const Message = S.Union([
    GotPersonalInfoMessage,
    GotWorkHistoryMessage,
    GotEducationMessage,
    GotSkillsMessage,
    GotCoverLetterMessage,
    GotAttachmentsMessage,
    GotStepMenuMessage,
    NavigatedToStep,
    ClickedNext,
    ClickedPrevious,
    ToggledPreview,
    SubmittedApplication,
    SucceededSubmitApplication,
    FailedSubmitApplication,
])

export type Message = typeof Message.Type
