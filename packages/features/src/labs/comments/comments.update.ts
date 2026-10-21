import { Array, Match as M } from "effect"
import { Command } from "foldkit"
import { NotValidated, allValid, validate } from "foldkit/fieldValidation"
import { evo } from "foldkit/struct"

import { GenerateComment } from "./comments.command.ts"
import type { Message } from "./comments.message.ts"
import type { Model } from "./comments.model.ts"
import { Creating, Ready } from "./comments.model.ts"
import {
    authorRules,
    contentRules,
    sanitizeCommentText,
} from "./comments.validation.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()
const validateAuthor = validate(authorRules)
const validateContent = validate(contentRules)

const submitComment = (model: Model): UpdateReturn => {
    if (model.submission._tag === "Creating") {
        return [model, []]
    }

    const author = validateAuthor(model.author.value)
    const content = validateContent(model.content.value)

    if (
        !allValid([
            [author, authorRules],
            [content, contentRules],
        ])
    ) {
        return [
            evo(model, { author: () => author, content: () => content }),
            [],
        ]
    }

    return [
        evo(model, { submission: () => Creating() }),
        [
            GenerateComment({
                author: sanitizeCommentText(author.value),
                content: sanitizeCommentText(content.value),
            }),
        ],
    ]
}

export const initialModel: Model = {
    author: NotValidated({ value: "" }),
    content: NotValidated({ value: "" }),
    comments: [],
    submission: Ready(),
}

export const init = (): UpdateReturn => [initialModel, []]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            UpdatedCommentAuthor: ({ value }) => [
                evo(model, { author: () => validateAuthor(value) }),
                [],
            ],
            UpdatedCommentContent: ({ value }) => [
                evo(model, { content: () => validateContent(value) }),
                [],
            ],
            SubmittedCommentForm: () => submitComment(model),
            CompletedGenerateComment: ({ comment }) => [
                evo(model, {
                    author: () => NotValidated({ value: "" }),
                    content: () => NotValidated({ value: "" }),
                    comments: Array.append(comment),
                    submission: () => Ready(),
                }),
                [],
            ],
            ClickedDeleteComment: ({ id }) => [
                evo(model, {
                    comments: Array.filter((comment) => comment.id !== id),
                }),
                [],
            ],
        })
    )
