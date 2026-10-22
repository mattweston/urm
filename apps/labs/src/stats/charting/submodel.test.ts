import { describe, expect, test } from "vitest"
import * as Charting from "@urm/features/labs/stats/charting"
import { changed_route, init, update } from "./submodel.ts"

const charting_route = { _tag: "Labs", labs_path: "/stats/charting" }

describe("charting lab lifecycle", () => {
    test("defers telemetry until entering and does not reload for a trailing slash", () => {
        const [inactive, deferred] = init({ _tag: "Labs", labs_path: "/" })
        expect(deferred).toHaveLength(0)
        const [active, commands] = changed_route(inactive, {
            _tag: "Labs",
            labs_path: charting_route.labs_path,
        })
        expect(active.active).toBe(true)
        expect(commands).toHaveLength(1)
        const [unchanged, repeated] = changed_route(active, {
            _tag: "Labs",
            labs_path: "/stats/charting/",
        })
        expect(unchanged).toBe(active)
        expect(repeated).toHaveLength(0)
    })

    test("resets on exit, ignores inactive messages, and reloads on reentry", () => {
        const [active] = init({
            _tag: "Labs",
            labs_path: charting_route.labs_path,
        })
        const [inactive, commands] = changed_route(active, {
            _tag: "Labs",
            labs_path: "/",
        })
        expect(inactive.active).toBe(false)
        expect(inactive.charting).toEqual(Charting.init()[0])
        expect(commands).toHaveLength(0)
        expect(update(inactive, Charting.ClickedRefresh())).toEqual([
            inactive,
            [],
        ])
        const [reentered, reload] = changed_route(inactive, {
            _tag: "Labs",
            labs_path: charting_route.labs_path,
        })
        expect(reentered.active).toBe(true)
        expect(reload).toHaveLength(1)
    })
})
