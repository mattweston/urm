import { expect, test } from "vitest"
import {
    LabsRoute,
    sidebarRouteTag,
} from "../../routing/route.ts"
import { changed_route, init, spreadsheets_href, update } from "./submodel.ts"

const route = LabsRoute({ labs_path: "/data/spreadsheets" })

test("routes the freeform workbook through Labs / Data", () => {
    expect(spreadsheets_href()).toBe("/data/spreadsheets")
    expect(sidebarRouteTag(route)).toBe("LabsSpreadsheets")
    expect(
        sidebarRouteTag(LabsRoute({ labs_path: "/data/spreadsheets/" }))
    ).toBe("LabsSpreadsheets")
    expect(sidebarRouteTag(LabsRoute({ labs_path: "/data" }))).toBe(
        "LabsData"
    )
    expect((init(route).commands ?? []).map((command) => command.name)).toEqual(
        ["LoadWorkbook"]
    )
})

test("loads on first visit and preserves workbook state across navigation", () => {
    const { model: inactive, commands: initial_commands } =
        init(LabsRoute({ labs_path: "/" }))
    expect(initial_commands).toHaveLength(0)
    const { model: active, commands } = changed_route(inactive, route)
    expect((commands ?? []).map((command) => command.name)).toEqual([
        "LoadWorkbook",
    ])
    const { model: edited } = update(active, {
        _tag: "UpdatedNameDraft",
        value: "B4",
    })
    const { model: away } = changed_route(edited, LabsRoute({ labs_path: "/" }))
    expect(away.active).toBe(false)
    const { model: returned, commands: return_commands } = changed_route(
        away,
        route
    )
    expect(returned.spreadsheet.nameDraft).toBe("B4")
    expect(returned.spreadsheet).toBe(edited.spreadsheet)
    // A workbook already loaded needs no Commands, so this branch omits the
    // field rather than returning an empty collection.
    expect(return_commands).toBeUndefined()
})
