import { ReplaceFilters } from "@urm/features/labs/routing/query-sync-table"
import { Option } from "effect"
import { Scene } from "foldkit"
import { Url } from "foldkit/url"
import { describe, expect, test } from "vitest"
import {
    DashboardRoute,
    routeForUrl,
    sidebarRouteTag,
} from "../../../routing/route.ts"
import {
    changed_route,
    init,
    query_sync_table_href,
    update,
    view,
} from "./submodel.ts"

const route_for_href = (href: string) => {
    const browser_url = new URL(href, "https://urm.test")
    const search = browser_url.search.replace(/^\?/, "")
    return routeForUrl(
        Url.make({
            protocol: "https:",
            host: "urm.test",
            port: Option.none(),
            pathname: browser_url.pathname,
            search: search === "" ? Option.none() : Option.some(search),
            hash: Option.none(),
        })
    )
}

const scene_config = { update, view }

const initial = () => init(route_for_href(query_sync_table_href()))

describe("client routing query-sync table lab", () => {
    test("opens the routing lab and restores all URL controls", () => {
        const route = route_for_href(
            "/labs/routing/query-sync-table/?search=rex&diet=Carnivore&period=Cretaceous&sorting=Weight%3ADescending"
        )
        const model = init(route)
        expect(query_sync_table_href()).toBe("/labs/routing/query-sync-table/")
        expect(model.active).toBe(true)
        expect(sidebarRouteTag(route)).toBe("LabsQuerySyncTable")
        expect(model.table.route).toEqual({
            _tag: "QuerySyncTable",
            search: Option.some("rex"),
            diet: Option.some("Carnivore"),
            period: Option.some("Cretaceous"),
            sorting: { _tag: "Descending", column: "Weight" },
        })
    })

    test("renders the table and filters through the real search input", () => {
        Scene.scene(
            scene_config,
            Scene.given(initial()),
            Scene.expect(
                Scene.role("heading", { name: "Dinosaur Explorer" })
            ).toExist(),
            Scene.expect(Scene.role("table")).toExist(),
            Scene.type(Scene.placeholder("Search by name..."), "Tyrannosaurus"),
            Scene.expect(Scene.text("Tyrannosaurus Rex")).toExist(),
            Scene.expect(Scene.text("Triceratops")).toBeAbsent(),
            Scene.tap(({ commands }) => {
                expect(commands).toHaveLength(1)
                expect(commands[0]?.args).toEqual({
                    href: "/labs/routing/query-sync-table/?search=Tyrannosaurus",
                })
            }),
            Scene.Command.resolve(ReplaceFilters, {
                _tag: "CompletedReplaceUrl",
            })
        )
    })

    test("preserves filters while sorting and emits client path URLs", () => {
        const [searched] = update(initial(), {
            _tag: "ChangedSearchInput",
            value: "rex & co/",
        })
        const [filtered] = update(searched, {
            _tag: "SelectedDietFilter",
            value: "Carnivore",
        })
        const [period] = update(filtered, {
            _tag: "SelectedPeriodFilter",
            value: "Cretaceous",
        })
        const [ascending, commands] = update(period, {
            _tag: "ClickedColumnHeader",
            column: "Name",
        })
        expect(commands[0]?.args).toEqual({
            href: "/labs/routing/query-sync-table/?search=rex+%26+co%2F&sorting=Name%3AAscending&diet=Carnivore&period=Cretaceous",
        })
        const [descending] = update(ascending, {
            _tag: "ClickedColumnHeader",
            column: "Name",
        })
        const [unsorted] = update(descending, {
            _tag: "ClickedColumnHeader",
            column: "Name",
        })
        expect(unsorted.table.route).toEqual(period.table.route)
    })

    test("handles navigation, query endings, and malformed filter values", () => {
        const restored = changed_route(
            initial(),
            route_for_href(
                "/labs/routing/query-sync-table/?search=path/&diet=invalid&period=invalid&sorting=bad"
            )
        )
        expect(restored.table.route).toEqual({
            _tag: "QuerySyncTable",
            search: Option.some("path/"),
            diet: Option.none(),
            period: Option.none(),
            sorting: { _tag: "Unsorted" },
        })
        const inactive = changed_route(restored, DashboardRoute())
        expect(inactive.active).toBe(false)
        expect(
            update(inactive, { _tag: "ChangedSearchInput", value: "late" })
        ).toEqual([inactive, []])
        expect(
            changed_route(inactive, route_for_href(query_sync_table_href()))
                .table
        ).toEqual(initial().table)
    })

    test("renders unknown child paths with a client return link", () => {
        Scene.scene(
            scene_config,
            Scene.given(
                init(route_for_href("/labs/routing/query-sync-table/missing"))
            ),
            Scene.expect(Scene.text("404")).toExist(),
            Scene.expect(
                Scene.role("link", { name: "Back to Query Sync Table" })
            ).toHaveAttr("href", query_sync_table_href())
        )
    })
})
