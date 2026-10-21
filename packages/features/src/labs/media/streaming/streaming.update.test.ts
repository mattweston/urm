import { Option } from "effect"
import { describe, expect, it } from "vitest"

import {
    ClickedToggleStream,
    FailedStream,
    StartedStream,
} from "./streaming.message.ts"
import { init, update } from "./streaming.update.ts"

describe("streaming update", () => {
    it("starts and stops the requested stream", () => {
        const [starting] = update(init(), ClickedToggleStream())
        expect(starting.status).toBe("Starting")

        const [streaming] = update(starting, StartedStream())
        expect(streaming.status).toBe("Streaming")

        const [stopped] = update(streaming, ClickedToggleStream())
        expect(stopped.status).toBe("Idle")
    })

    it("returns to idle when permission fails", () => {
        const [failed] = update(
            init(),
            FailedStream({ errorMessage: "Permission denied" })
        )

        expect(failed.status).toBe("Idle")
        expect(failed.errorMessage).toEqual(Option.some("Permission denied"))
    })
})
