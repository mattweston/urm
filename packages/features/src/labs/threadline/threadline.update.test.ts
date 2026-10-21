import { describe, expect, it } from "vitest"
import {
    ChangedComposer,
    ChangedRoute,
    CompletedLike,
    CompletedPost,
    RetriedNotice,
    SubmittedPost,
    ToggledLike,
    ToggledOnline,
} from "./threadline.message.ts"
import { Route, postsForRoute } from "./threadline.model.ts"
import { init, update } from "./threadline.update.ts"

describe("Threadline update", () => {
    it("publishes optimistically and settles the authored post", () => {
        const [model] = init()
        const [composed] = update(
            model,
            ChangedComposer({ value: "A useful field note" })
        )
        const [sending, commands] = update(composed, SubmittedPost())
        const [published] = update(
            sending,
            CompletedPost({
                id: "local-post-1",
                body: "A useful field note",
                is_success: true,
            })
        )

        expect(sending.posts[0]?.status).toBe("Sending")
        expect(commands).toHaveLength(1)
        expect(published.posts[0]?.status).toBe("Published")
    })

    it("rolls back offline posts and keeps independent retry data", () => {
        const [model] = init()
        const [offline] = update(model, ToggledOnline())
        const [composed] = update(
            offline,
            ChangedComposer({ value: "Retry this later" })
        )
        const [sending] = update(composed, SubmittedPost())
        const [rolled_back] = update(
            sending,
            CompletedPost({
                id: "local-post-1",
                body: "Retry this later",
                is_success: false,
            })
        )
        const notice_id = rolled_back.notices[0]?.id ?? 0
        const [still_offline, commands] = update(
            rolled_back,
            RetriedNotice({ id: notice_id })
        )

        expect(
            rolled_back.posts.some((post) => post.id === "local-post-1")
        ).toBe(false)
        expect(rolled_back.notices[0]?.retry_kind).toBe("Post")
        expect(still_offline).toEqual(rolled_back)
        expect(commands).toHaveLength(0)
    })

    it("ignores stale like acknowledgements", () => {
        const [model] = init()
        const [first] = update(model, ToggledLike({ id: "maya-release" }))
        const [second] = update(first, ToggledLike({ id: "maya-release" }))
        const [unchanged] = update(
            second,
            CompletedLike({
                id: "maya-release",
                operation: 1,
                is_success: true,
            })
        )

        expect(unchanged).toEqual(second)
    })

    it("filters saved and profile routes", () => {
        const [model] = init()
        expect(
            postsForRoute(model.posts, Route.cases.Saved.make({}))
        ).toHaveLength(2)
        const [maya] = update(
            model,
            ChangedRoute({
                route: Route.cases.Profile.make({ handle: "maya" }),
            })
        )
        expect(postsForRoute(maya.posts, maya.route)).toHaveLength(2)
    })
})
