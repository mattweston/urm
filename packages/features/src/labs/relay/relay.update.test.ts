import { Option } from "effect"
import { describe, expect, it } from "vitest"
import {
    ChangedChannel,
    ChangedComposer,
    CompletedPublish,
    LoadedThread,
    OpenedThread,
    SubmittedMessage,
    ToggledConnection,
} from "./relay.message.ts"
import { people } from "./relay.model.ts"
import { init, update } from "./relay.update.ts"

describe("Relay update", () => {
    it("publishes optimistically and reconciles by request id", () => {
        const [model] = init()
        const [composed] = update(
            model,
            ChangedComposer({ value: "Ready to ship" })
        )
        const [pending, commands] = update(composed, SubmittedMessage())
        const optimistic = pending.messages.at(-1)
        const [published] = update(
            pending,
            CompletedPublish({
                request_id: "request-20",
                published: {
                    id: "server-20",
                    channel: "general",
                    author: people.avery,
                    body: "Ready to ship",
                    sent_at: "Just now",
                    order: 20,
                    reactions: 0,
                    thread_count: 0,
                    request_id: Option.some("request-20"),
                    delivery: "Published",
                },
                is_success: true,
            })
        )

        expect(optimistic?.delivery).toBe("Pending")
        expect(commands).toHaveLength(1)
        expect(
            published.messages.filter((item) =>
                Option.contains(item.request_id, "request-20")
            )
        ).toHaveLength(1)
        expect(published.messages.at(-1)?.delivery).toBe("Published")
    })

    it("keeps drafts but prevents publishing while paused", () => {
        const [model] = init()
        const [paused] = update(model, ToggledConnection())
        const [drafted] = update(
            paused,
            ChangedComposer({ value: "Safe draft" })
        )
        const [unchanged, commands] = update(drafted, SubmittedMessage())

        expect(unchanged.composer).toBe("Safe draft")
        expect(commands).toHaveLength(0)
    })

    it("does not leak a stale thread response across channels", () => {
        const [model] = init()
        const [loading] = update(model, OpenedThread({ id: "g-014" }))
        const [design] = update(loading, ChangedChannel({ channel: "design" }))
        const [unchanged] = update(
            design,
            LoadedThread({
                channel: "general",
                id: "g-014",
                replies: [],
                is_available: true,
            })
        )

        expect(unchanged).toEqual(design)
        expect(unchanged.thread_replies).toEqual([])
    })
})
