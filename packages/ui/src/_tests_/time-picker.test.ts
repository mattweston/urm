import { Option } from "effect"
import { describe, expect, it } from "vitest"

import * as TimePicker from "../foldkit/time-picker.ts"

describe("time picker", () => {
    it("decodes and normalizes a complete 24-hour value", () => {
        const model = TimePicker.init({ id: "schedule", value: "09:07" })

        expect(Option.getOrNull(TimePicker.value(model))).toBe("09:07")
    })

    it("keeps incomplete typed values invalid", () => {
        const model = TimePicker.update(
            TimePicker.init({ id: "schedule" }),
            TimePicker.ChangedHour({ value: "14" })
        )

        expect(Option.isNone(TimePicker.value(model))).toBe(true)
    })

    it("carries five-minute steps across midnight", () => {
        const model = TimePicker.update(
            TimePicker.init({ id: "schedule", value: "23:58" }),
            TimePicker.SteppedMinute({ amount: 5 })
        )

        expect(Option.getOrNull(TimePicker.value(model))).toBe("00:03")
    })
})
