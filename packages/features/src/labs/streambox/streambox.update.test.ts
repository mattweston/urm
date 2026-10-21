import { describe, expect, it } from "vitest"
import {
    ChangedVideo,
    SelectedPanel,
    SoughtVideo,
    ToggledLike,
    ToggledOnline,
    ToggledSave,
} from "./streambox.message.ts"
import { commentsForVideo } from "./streambox.model.ts"
import { init, update } from "./streambox.update.ts"

describe("Streambox update", () => {
    it("keeps panel changes around the same player state", () => {
        const [model] = init()
        const [seeked] = update(model, SoughtVideo({ time: 3.5 }))
        const [comments] = update(seeked, SelectedPanel({ panel: "Comments" }))
        const [transcript] = update(
            comments,
            SelectedPanel({ panel: "Transcript" })
        )

        expect(transcript.current_time).toBe(3.5)
        expect(transcript.video_id).toBe("neon-tides")
    })

    it("isolates likes and saves by video", () => {
        const [model] = init()
        const [liked] = update(model, ToggledLike())
        const [saved] = update(liked, ToggledSave())
        const [other] = update(saved, ChangedVideo({ id: "quiet-current" }))

        expect(other.liked_video_ids).toEqual(["neon-tides"])
        expect(other.saved_video_ids).toEqual(["neon-tides"])
        expect(other.liked_video_ids.includes(other.video_id)).toBe(false)
    })

    it("queues offline actions and clears them after reconnect", () => {
        const [model] = init()
        const [offline] = update(model, ToggledOnline())
        const [queued] = update(offline, ToggledLike())
        const [reconnected] = update(queued, ToggledOnline())

        expect(queued.queued_actions).toBe(1)
        expect(reconnected.queued_actions).toBe(0)
    })

    it("provides the archived 180-comment fixture", () => {
        expect(commentsForVideo("neon-tides")).toHaveLength(180)
    })
})
