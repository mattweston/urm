import { Schema as S } from "effect"
import { Field } from "foldkit/fieldValidation"
import { taggedStruct } from "foldkit/schema"

import { Comment } from "./comment.ts"

export const Ready = taggedStruct("Ready")
export const Creating = taggedStruct("Creating")
export const Submission = S.Union([Ready, Creating])
export type Submission = typeof Submission.Type

export const Model = S.Struct({
    author: Field(S.String),
    content: Field(S.String),
    comments: S.Array(Comment),
    submission: Submission,
})
export type Model = typeof Model.Type
