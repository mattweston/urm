import { Option } from "effect"
import { Url } from "foldkit/url"
import { describe, expect, test } from "vitest"
import { routeForUrl, sidebarRouteTag } from "../routing/route.ts"
import { demos, demo_href } from "./catalog.ts"
import {
    changed_route,
    init,
    update,
    GotButtonMessage,
    GotTimePickerMessage,
    subscriptions,
} from "./submodel.ts"

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

describe("client UI labs", () => {
    test.each(demos)(
        "opens $label with the corresponding sidebar item",
        ({ slug }) => {
            const route = route_for_path(`${demo_href(slug)}/`)
            const [model, commands] = init(route)
            expect(model.path).toBe(`/labs/ui/${slug}`)
            expect(sidebarRouteTag(route)).toBe(`LabsUi-${slug}`)
            expect(commands).toEqual([])
        }
    )

    test("updates the active lab and preserves it on same-route navigation", () => {
        const route = route_for_path("/labs/ui/button")
        const [model] = init(route)
        const [clicked] = update(
            model,
            GotButtonMessage({ message: { _tag: "ClickedButton" } })
        )
        expect(clicked.button.clickCount).toBe(model.button.clickCount + 1)
        expect(changed_route(clicked, route)).toEqual([clicked, []])
        expect(changed_route(clicked, route)[0]).toBe(clicked)
    })

    test("ignores inactive messages after navigation and resets demo state", () => {
        const [model] = init(route_for_path("/labs/ui/button"))
        const click = GotButtonMessage({ message: { _tag: "ClickedButton" } })
        const [clicked] = update(model, click)
        const [exited] = changed_route(clicked, route_for_path("/dashboard"))
        expect(exited.path).toBe("")
        expect(exited.button.clickCount).toBe(model.button.clickCount)
        expect(update(exited, click)).toEqual([exited, []])
        const [input] = changed_route(clicked, route_for_path("/labs/ui/input"))
        expect(update(input, click)[0]).toBe(input)
    })

    test("updates the time picker lab through its nested message", () => {
        const [model] = init(route_for_path("/labs/ui/time-picker"))
        const [stepped] = update(
            model,
            GotTimePickerMessage({
                message: {
                    _tag: "GotTimePickerMessage",
                    message: { _tag: "SteppedMinute", amount: 5 },
                },
            })
        )

        expect(stepped.time_picker.picker.minute).toBe("35")
    })

    test("gates pointer and resize subscriptions to the active demo", () => {
        const [inactive] = init(route_for_path("/dashboard"))
        for (const subscription of Object.values(subscriptions)) {
            expect(subscription.modelToDependencies(inactive)).toEqual({
                maybeDependencies: Option.none(),
            })
        }
        // This counted VirtualList's two container observers until
        // @foldkit/ui 0.168 moved them into the view's ObserveVirtualList
        // Mount. Drag and drop is now the demo with subscriptions of its own,
        // and its four entries open while the Slider lift stays closed.
        const [active] = init(route_for_path("/labs/ui/drag-and-drop"))
        const dependencies = Object.values(subscriptions).map((subscription) =>
            subscription.modelToDependencies(active)
        )
        expect(
            dependencies.filter((dependency) =>
                Option.isSome(dependency.maybeDependencies)
            )
        ).toHaveLength(4)
    })
})
