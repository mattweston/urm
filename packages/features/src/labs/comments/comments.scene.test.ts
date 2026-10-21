import { Scene } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { describe, test } from "vitest"

import { Comment } from "./comment.ts"
import { GenerateComment } from "./comments.command.ts"
import { CompletedGenerateComment } from "./comments.message.ts"
import type { Message } from "./comments.message.ts"
import type { Model } from "./comments.model.ts"
import { initialModel, update } from "./comments.update.ts"
import { view } from "./comments.view.ts"

const comment = Comment.make({
    id: "comment-1",
    author: "Ada",
    content: "A useful comment",
    created_at: 1_700_000_000_000,
    updated_at: 1_700_000_000_000,
})

const standaloneView = (model: Model, h: HtmlBuilder<Message>): Html =>
    view(model, (message) => message, h)

describe("comments view", () => {
    test("renders the empty form", () => {
        Scene.scene(
            {
                update: (
                    model: Parameters<typeof update>[0],
                    message: Parameters<typeof update>[1]
                ) => {
                    const [next_model, commands] = update(model, message)
                    return { model: next_model, commands }
                },
                view: standaloneView,
            },
            Scene.given(initialModel),
            Scene.expect(Scene.role("heading", { name: "Comments" })).toExist(),
            Scene.expect(Scene.label("Name")).toExist(),
            Scene.expect(Scene.label("Comment")).toExist(),
            Scene.expect(Scene.role("button", { name: "Submit" })).toExist(),
            Scene.expect(Scene.text("No comments yet.")).toExist()
        )
    })

    test("submits, displays, and deletes a comment", () => {
        Scene.scene(
            {
                update: (
                    model: Parameters<typeof update>[0],
                    message: Parameters<typeof update>[1]
                ) => {
                    const [next_model, commands] = update(model, message)
                    return { model: next_model, commands }
                },
                view: standaloneView,
            },
            Scene.given(initialModel),
            Scene.type(Scene.label("Name"), "Ada"),
            Scene.type(Scene.label("Comment"), "A useful comment"),
            Scene.submit(Scene.role("form", { name: "Add comment" })),
            Scene.Command.expectExact(
                GenerateComment({ author: "Ada", content: "A useful comment" })
            ),
            Scene.Command.resolve(
                GenerateComment,
                CompletedGenerateComment({ comment })
            ),
            Scene.expect(Scene.text("A useful comment")).toExist(),
            Scene.expect(Scene.text("— Ada")).toExist(),
            Scene.expect(Scene.label("Name")).toHaveValue(""),
            Scene.expect(Scene.label("Comment")).toHaveValue(""),
            Scene.click(
                Scene.role("button", { name: "Delete comment by Ada" })
            ),
            Scene.Command.expectNone(),
            Scene.expect(Scene.text("A useful comment")).toBeAbsent(),
            Scene.expect(Scene.text("No comments yet.")).toExist()
        )
    })
})
