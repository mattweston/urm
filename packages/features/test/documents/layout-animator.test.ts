import { describe, expect, it } from "vitest"

import {
    ToggledLayoutAnimatorPlayback,
    init,
    update,
} from "../../src/documents/documentation/layout-animator.ts"

describe("documentation layout animator", () => {
    it("pauses and resumes each wrapper independently", () => {
        const initial = init()
        const first_paused = update(
            initial,
            ToggledLayoutAnimatorPlayback({ id: "first-demo" })
        )
        const both_paused = update(
            first_paused,
            ToggledLayoutAnimatorPlayback({ id: "second-demo" })
        )
        const second_only_paused = update(
            both_paused,
            ToggledLayoutAnimatorPlayback({ id: "first-demo" })
        )

        expect(first_paused.paused_ids).toEqual(["first-demo"])
        expect(both_paused.paused_ids).toEqual(["first-demo", "second-demo"])
        expect(second_only_paused.paused_ids).toEqual(["second-demo"])
    })
})
