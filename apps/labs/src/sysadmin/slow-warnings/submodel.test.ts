import { describe, expect, it } from "vitest"
import {
    LabsRoute,
    sidebarRouteTag,
} from "../../routing/route.ts"
import { changed_route, init, slow_warnings_href, update } from "./submodel.ts"

const route = LabsRoute({ labs_path: "/sysadmin/slow-warnings" })

describe("client slow warnings lab", () => {
    it("opens through client navigation under Sysadmin", () => {
        expect(init(route).active).toBe(true)
        expect(slow_warnings_href()).toBe("/sysadmin/slow-warnings")
        expect(sidebarRouteTag(route)).toBe("LabsSlowWarnings")
        expect(
            sidebarRouteTag(LabsRoute({ labs_path: `${route.labs_path}/` }))
        ).toBe("LabsSlowWarnings")
        expect(
            sidebarRouteTag(LabsRoute({ labs_path: "/sysadmin" }))
        ).toBe("LabsSysadmin")
    })

    it("records warnings and resets workloads on exit", () => {
        const [running] = update(init(route), {
            _tag: "ClickedRunSubscriptionDependenciesWork",
        })
        expect(running.warnings.activeWorkload).toBe("SubscriptionDependencies")
        const [recorded] = update(running, {
            _tag: "RecordedSlowWarning",
            report: {
                phase: "SubscriptionDependencies",
                durationMs: 8,
                thresholdMs: 2,
                trigger: "dependencies",
                details: "Slow dependencies",
            },
        })
        expect(recorded.warnings.warnings).toHaveLength(1)
        expect(recorded.warnings.activeWorkload).toBe("Idle")
        const inactive = changed_route(recorded, LabsRoute({ labs_path: "/" }))
        expect(inactive.active).toBe(false)
        expect(inactive.warnings.warnings).toEqual([])
        expect(update(inactive, { _tag: "ClickedRunViewWork" })).toEqual([
            inactive,
            [],
        ])
        expect(changed_route(inactive, route)).toEqual(init(route))
    })
})
