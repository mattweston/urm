import { expect, test } from "vitest"
import {
    DashboardRoute,
    LabsRoute,
    sidebarRouteTag,
} from "../../../routing/route.ts"
import { changed_route, init, spreadsheets_href, update } from "./submodel.ts"

const route = LabsRoute({ labs_path: "/labs/data/spreadsheets" })

test("routes the freeform workbook through Labs / Data", () => {
    expect(spreadsheets_href()).toBe("/labs/data/spreadsheets")
    expect(sidebarRouteTag(route)).toBe("LabsSpreadsheets")
    expect(
        sidebarRouteTag(LabsRoute({ labs_path: "/labs/data/spreadsheets/" }))
    ).toBe("LabsSpreadsheets")
    expect(sidebarRouteTag(LabsRoute({ labs_path: "/labs/data" }))).toBe(
        "LabsData"
    )
    expect(init(route)[1].map((command) => command.name)).toEqual([
        "LoadWorkbook",
    ])
})

test("loads on first visit and preserves workbook state across navigation", () => {
    const [inactive, initial_commands] = init(DashboardRoute())
    expect(initial_commands).toHaveLength(0)
    const [active, commands] = changed_route(inactive, route)
    expect(commands.map((command) => command.name)).toEqual(["LoadWorkbook"])
    const [edited] = update(active, { _tag: "UpdatedNameDraft", value: "B4" })
    const [away] = changed_route(edited, DashboardRoute())
    expect(away.active).toBe(false)
    const [returned, return_commands] = changed_route(away, route)
    expect(returned.spreadsheet.nameDraft).toBe("B4")
    expect(returned.spreadsheet).toBe(edited.spreadsheet)
    expect(return_commands).toHaveLength(0)
})
