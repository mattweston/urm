import { Story } from "foldkit"
import { describe, expect, test } from "vitest"

import { Comment } from "./comment.ts"
import { GenerateComment } from "./comments.command.ts"
import {
    ClickedDeleteComment,
    CompletedGenerateComment,
    SubmittedCommentForm,
    UpdatedCommentAuthor,
    UpdatedCommentContent,
} from "./comments.message.ts"
import { initialModel, update } from "./comments.update.ts"

const comment = Comment.make({
    id: "comment-1",
    author: "Ada",
    content: "A useful comment",
    created_at: 1_700_000_000_000,
    updated_at: 1_700_000_000_000,
})

describe("comments update", () => {
    test("submitting empty fields exposes validation errors", () => {
        Story.story(
            (
                model: Parameters<typeof update>[0],
                message: Parameters<typeof update>[1]
            ) => {
                const [next_model, commands] = update(model, message)
                return { model: next_model, commands }
            },
            Story.given(initialModel),
            Story.message(SubmittedCommentForm()),
            Story.Command.expectNone(),
            Story.model((model) => {
                expect(model.author._tag).toBe("Invalid")
                expect(model.content._tag).toBe("Invalid")
            })
        )
    })

    test("unsafe content is rejected", () => {
        Story.story(
            (
                model: Parameters<typeof update>[0],
                message: Parameters<typeof update>[1]
            ) => {
                const [next_model, commands] = update(model, message)
                return { model: next_model, commands }
            },
            Story.given(initialModel),
            Story.message(
                UpdatedCommentContent({ value: "<script>alert(1)</script>" })
            ),
            Story.model((model) => {
                expect(model.content._tag).toBe("Invalid")
            })
        )
    })

    test("a valid submission creates an in-memory comment and resets the form", () => {
        Story.story(
            (
                model: Parameters<typeof update>[0],
                message: Parameters<typeof update>[1]
            ) => {
                const [next_model, commands] = update(model, message)
                return { model: next_model, commands }
            },
            Story.given(initialModel),
            Story.message(UpdatedCommentAuthor({ value: " Ada " })),
            Story.message(
                UpdatedCommentContent({ value: " A useful comment " })
            ),
            Story.message(SubmittedCommentForm()),
            Story.Command.expectExact(
                GenerateComment({
                    author: "Ada",
                    content: "A useful comment",
                })
            ),
            Story.Command.resolve(
                GenerateComment,
                CompletedGenerateComment({ comment })
            ),
            Story.model((model) => {
                expect(model.comments).toStrictEqual([comment])
                expect(model.author.value).toBe("")
                expect(model.content.value).toBe("")
                expect(model.submission._tag).toBe("Ready")
            })
        )
    })

    test("deleting removes only the selected comment", () => {
        Story.story(
            (
                model: Parameters<typeof update>[0],
                message: Parameters<typeof update>[1]
            ) => {
                const [next_model, commands] = update(model, message)
                return { model: next_model, commands }
            },
            Story.given({ ...initialModel, comments: [comment] }),
            Story.message(ClickedDeleteComment({ id: comment.id })),
            Story.Command.expectNone(),
            Story.model((model) => {
                expect(model.comments).toStrictEqual([])
            })
        )
    })
})
