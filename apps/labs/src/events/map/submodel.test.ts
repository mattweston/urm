import { Option } from "effect"
import { Url } from "foldkit/url"
import { describe, expect, test } from "vitest"

import { routeForUrl, sidebarRouteTag } from "../../routing/route.ts"
import { changed_route, init, update } from "./submodel.ts"

const route_for_path = (path: string) =>
    routeForUrl(
        Url.make({
            protocol: "http:",
            host: "urm.test",
            port: Option.none(),
            pathname: path,
            search: Option.none(),
            hash: Option.none(),
        })
    )

describe("client map labs", () => {
    test.each([
        ["interactive-map", "InteractiveMap"],
        ["map", "Map"],
        ["journey", "Journey"],
        ["isochrone", "Isochrone"],
        ["storymap", "Storymap"],
        ["weather", "Weather"],
        ["weather-map", "WeatherMap"],
    ])("opens %s from its sidebar route", (slug, tag) => {
        const route = route_for_path(`/events/map/${slug}/`)
        const [model] = init(route)
        expect(model.route._tag).toBe(tag)
        expect(sidebarRouteTag(route)).toBe(`LabsMap-${slug}`)
    })

    test("clears map subscriptions on exit and ignores late mount messages", () => {
        const route = route_for_path("/events/map/map")
        const [initial] = init(route)
        const [mounted] = update(initial, {
            _tag: "GotMapMessage",
            message: { _tag: "SucceededMountMap", hostId: "test-map" },
        })
        expect(Option.isSome(mounted.map.maybeMapHostId)).toBe(true)

        const [exited, commands] = changed_route(
            mounted,
            route,
            route_for_path("/dashboard")
        )
        expect(Option.isNone(exited.map.maybeMapHostId)).toBe(true)
        expect(commands).toEqual([])

        const [late, late_commands] = update(exited, {
            _tag: "GotMapMessage",
            message: { _tag: "SucceededMountMap", hostId: "test-map" },
        })
        expect(late).toBe(exited)
        expect(late_commands).toEqual([])
    })

    test("does not reinitialize the active demo for the same route", () => {
        const route = route_for_path("/events/map/weather-map")
        const [model] = init(route)
        const [next, commands] = changed_route(model, route, route)
        expect(next).toBe(model)
        expect(commands).toEqual([])
    })
})
