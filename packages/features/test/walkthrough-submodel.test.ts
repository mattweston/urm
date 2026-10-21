import { Array, Option } from "effect"
import { describe, expect, it } from "vitest"

import * as Comments from "../src/learn/walkthrough/examples/embedding.ts"
import * as Composer from "../src/learn/walkthrough/examples/composer.ts"
import * as Search from "../src/learn/walkthrough/examples/streaming.ts"
import * as Todos from "../src/learn/walkthrough/examples/items.ts"

const thread_at = (model: Comments.Model, index: number): Comments.Thread => {
    const thread = Array.get(model.threads, index)
    expect(Option.isSome(thread)).toBe(true)
    return Option.getOrThrow(thread)
}

const typed_into_thread = (
    model: Comments.Model,
    thread_id: number,
    value: string
): Comments.Model =>
    Comments.update(
        model,
        Comments.GotComposerMessage({
            id: thread_id,
            message: Composer.UpdatedComposerDraft({ value }),
        })
    ).model

describe("Foldkit submodel example", () => {
    it("reports a post through an OutMessage rather than writing the parent", () => {
        const { model, outMessage: maybe_out_message_value } = Composer.update(
            Composer.Model.make({ draft: "  Ship it  " }),
            Composer.SubmittedComposer()
        )
        const maybe_out_message = Option.fromUndefinedOr(
            maybe_out_message_value
        )

        expect(model.draft).toBe("")
        expect(maybe_out_message).toEqual(
            Option.some(Composer.PostedComment({ text: "Ship it" }))
        )
    })

    it("keeps a blank submission out of the thread", () => {
        const { outMessage: maybe_out_message_value } = Composer.update(
            Composer.Model.make({ draft: "   " }),
            Composer.SubmittedComposer()
        )
        const maybe_out_message = Option.fromUndefinedOr(
            maybe_out_message_value
        )

        expect(maybe_out_message).toEqual(Option.none())
    })

    it("routes a composer message to one thread only", () => {
        const model = typed_into_thread(Comments.init, 2, "Broken link")

        expect(thread_at(model, 1).composer.draft).toBe("Broken link")
        expect(thread_at(model, 0).composer.draft).toBe("")
    })

    it("appends the posted comment with the thread's own next id", () => {
        const typed = typed_into_thread(Comments.init, 2, "Broken link")
        const { model } = Comments.update(
            typed,
            Comments.GotComposerMessage({
                id: 2,
                message: Composer.SubmittedComposer(),
            })
        )
        const thread = thread_at(model, 1)

        expect(thread.posts).toEqual([
            Comments.Post.make({ post_id: 1, text: "Broken link" }),
        ])
        expect(thread.next_post_id).toBe(2)
        expect(thread_at(model, 0).posts).toHaveLength(1)
    })
})

describe("Foldkit todo filter example", () => {
    const two_todos = (): Todos.Model => {
        const { model: drafted } = Todos.update(
            Todos.init,
            Todos.UpdatedTodoDraft({ value: "First" })
        )
        const { model: added } = Todos.update(drafted, Todos.SubmittedTodo())
        const { model: drafted_again } = Todos.update(
            added,
            Todos.UpdatedTodoDraft({ value: "Second" })
        )
        const { model: both } = Todos.update(
            drafted_again,
            Todos.SubmittedTodo()
        )
        return Todos.update(both, Todos.ToggledTodo({ todo_id: 1 })).model
    }

    it("derives the visible rows from the filter field", () => {
        const model = two_todos()

        expect(Todos.visible_items(model)).toHaveLength(2)
        expect(
            Todos.visible_items(
                Todos.update(
                    model,
                    Todos.SelectedTodoFilter({ filter: "Done" })
                ).model
            )
        ).toEqual([
            Todos.Todo.make({ todo_id: 1, text: "First", is_completed: true }),
        ])
        expect(
            Todos.visible_items(
                Todos.update(
                    model,
                    Todos.SelectedTodoFilter({ filter: "Open" })
                ).model
            )
        ).toEqual([
            Todos.Todo.make({
                todo_id: 2,
                text: "Second",
                is_completed: false,
            }),
        ])
    })
})

describe("Foldkit subscription example", () => {
    it("restarts the stream with a new token and no carried-over rows", () => {
        const { model: received } = Search.update(
            Search.init,
            Search.ReceivedSearchRow({
                row: Search.Row.make({
                    row_id: 1,
                    title: "Item 1",
                    description: "Description for item 1",
                }),
            })
        )
        const { model, commands = [] } = Search.update(
            received,
            Search.ClickedSearch()
        )

        expect(model.stream_token).toBe(Search.init.stream_token + 1)
        expect(model.is_streaming).toBe(true)
        expect(model.streamed).toEqual([])
        expect(commands).toHaveLength(0)
    })

    it("pulls a page with a Command when the Command pattern is selected", () => {
        const { model: pulling } = Search.update(
            Search.init,
            Search.SelectedSearchPattern({ pattern: "Command" })
        )
        const { model, commands = [] } = Search.update(
            pulling,
            Search.ClickedSearch()
        )

        expect(model.is_pulling).toBe(true)
        expect(commands).toHaveLength(1)
    })

    it("does not start a second page while one is in flight", () => {
        const { model: pulling } = Search.update(
            Search.init,
            Search.SelectedSearchPattern({ pattern: "Command" })
        )
        const { model: loading } = Search.update(
            pulling,
            Search.ClickedSearch()
        )
        const { model, commands = [] } = Search.update(
            loading,
            Search.ClickedLoadMore()
        )

        expect(model).toBe(loading)
        expect(commands).toHaveLength(0)
    })

    it("stops offering more pages once every match has arrived", () => {
        const all_rows = Search.matching(Search.init.query)
        const { model } = Search.update(
            Search.init,
            Search.CompletedLoadPage({ rows: all_rows })
        )

        expect(Search.has_more_pages(model)).toBe(false)
        expect(model.is_pulling).toBe(false)
    })
})
