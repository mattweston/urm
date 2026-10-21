import { describe, expect, it } from "vitest"

import { MailStatsFailed, MailStatsLoaded } from "./stats.message.ts"
import { init, update } from "./stats.update.ts"

describe("mail stats update", () => {
    it("loads a stats snapshot", () => {
        const [model] = init()
        const [next_model] = update(
            model,
            MailStatsLoaded({
                observedAt: 100,
                deliveries: [
                    {
                        id: "delivery-1",
                        purpose: "transactional",
                        isTest: false,
                        status: "sent",
                        createdAt: 50,
                    },
                ],
            })
        )

        expect(next_model.loading).toBe(false)
        expect(next_model.observedAt).toBe(100)
        expect(next_model.deliveries).toHaveLength(1)
    })

    it("retains an error", () => {
        const [model] = init()
        const [next_model] = update(
            model,
            MailStatsFailed({ error: "Could not load statistics" })
        )

        expect(next_model.loading).toBe(false)
        expect(next_model.error).toBe("Could not load statistics")
    })
})
