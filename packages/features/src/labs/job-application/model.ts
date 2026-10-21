import { Schema as S } from "effect"
import * as Ui from "@foldkit/ui"
import { taggedStruct } from "foldkit/schema"

import * as Attachments from "./step/attachments.ts"
import * as CoverLetter from "./step/coverLetter.ts"
import * as Education from "./step/education/education.ts"
import * as PersonalInfo from "./step/personalInfo.ts"
import * as Skills from "./step/skills/skills.ts"
import * as WorkHistory from "./step/workHistory/workHistory.ts"
import { Step } from "./domain/step.ts"

export const NotSubmitted = taggedStruct("NotSubmitted")
export const Submitting = taggedStruct("Submitting")
export const SubmitSuccess = taggedStruct("SubmitSuccess")
export const SubmitError = taggedStruct("SubmitError", { error: S.String })

export const Submission = S.Union([
    NotSubmitted,
    Submitting,
    SubmitSuccess,
    SubmitError,
])

export type Submission = typeof Submission.Type

export const Model = S.Struct({
    currentStep: Step,
    personalInfo: PersonalInfo.Model,
    workHistory: WorkHistory.Model,
    education: Education.Model,
    skills: Skills.Model,
    coverLetter: CoverLetter.Model,
    attachments: Attachments.Model,
    isPreviewVisible: S.Boolean,
    submission: Submission,
    stepMenu: Ui.Menu.Model,
})

export type Model = typeof Model.Type
