import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

import { Comment } from "./comment.ts"

export const UpdatedCommentAuthor = taggedStruct("UpdatedCommentAuthor", {
    value: S.String,
})
export const UpdatedCommentContent = taggedStruct("UpdatedCommentContent", {
    value: S.String,
})
export const SubmittedCommentForm = taggedStruct("SubmittedCommentForm")
export const CompletedGenerateComment = taggedStruct(
    "CompletedGenerateComment",
    {
        comment: Comment,
    }
)
export const ClickedDeleteComment = taggedStruct("ClickedDeleteComment", {
    id: S.String,
})

export const Message = S.Union([
    UpdatedCommentAuthor,
    UpdatedCommentContent,
    SubmittedCommentForm,
    CompletedGenerateComment,
    ClickedDeleteComment,
])
export type Message = typeof Message.Type
