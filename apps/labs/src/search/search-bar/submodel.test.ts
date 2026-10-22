import { OpenCommandDialog } from "@urm/ui/foldkit/command.view.ts"
import { Option } from "effect"
import { Scene, Submodel } from "foldkit"
import { describe, expect, test, vi } from "vitest"
import { LabsRoute, sidebarRouteTag } from "../../routing/route.ts"
import {
    changed_route,
    GotDemoMessage,
    GotHeaderMessage,
    handle_keyboard_event,
    header_view,
    init,
    search_bar_href,
    search_sections,
    update,
    type Model,
    type Message,
} from "./submodel.ts"

const sections = search_sections([
    { label: "Dashboard", href: "/dashboard" },
    {
        label: "Labs",
        href: "/labs",
        children: [
            {
                label: "Search",
                href: search_bar_href(),
                children: [{ label: "Search Bar", href: search_bar_href() }],
            },
        ],
    },
])
const view = Submodel.defineView<Model, Message>((model, h) =>
    header_view(model, sections, (message) => message, h)
)

describe("page search", () => {
    test("uses nested navigation labels and deduplicates destinations", () => {
        expect(sections.flatMap((section) => section.pages)).toEqual([
            { label: "Dashboard", href: "/dashboard" },
            { label: "Labs", href: "/labs" },
            { label: "Search Bar", href: search_bar_href() },
        ])
        expect(sections.at(-1)?.label).toBe("Labs / Search")
        expect(
            sidebarRouteTag(LabsRoute({ labs_path: "/labs/search/search-bar" }))
        ).toBe("LabsSearchBar")
    })

    test("filters actual rendered results and closes after selection", () => {
        Scene.scene(
            { update, view },
            Scene.given(init()),
            Scene.click(Scene.role("button", { name: "Search pages" })),
            Scene.expect(
                Scene.role("dialog", { name: "Search pages" })
            ).toExist(),
            Scene.Mount.resolve(
                OpenCommandDialog(),
                GotHeaderMessage({ message: { _tag: "MountedSearchBar" } })
            ),
            Scene.type(Scene.placeholder("Search pages..."), "search"),
            Scene.expect(
                Scene.role("link", { name: "Dashboard" })
            ).toBeAbsent(),
            Scene.expect(Scene.role("link", { name: "Search Bar" })).toExist(),
            Scene.click(Scene.role("link", { name: "Search Bar" })),
            Scene.expect(
                Scene.role("dialog", { name: "Search pages" })
            ).toBeAbsent(),
            Scene.Mount.expectEnded(OpenCommandDialog)
        )
    })

    test("keeps demo and header state separate and resets on navigation", () => {
        const { model: demo } = update(
            init(),
            GotDemoMessage({
                message: { _tag: "ChangedSearchBarQuery", value: "labs" },
            })
        )
        expect(demo.demo.query).toBe("labs")
        expect(demo.header.isOpen).toBe(false)
        const { model: header } = update(
            demo,
            GotHeaderMessage({ message: { _tag: "ToggledSearchBarIsOpen" } })
        )
        expect(header.header.isOpen).toBe(true)
        expect(header.demo).toEqual({ isOpen: false, query: "" })
        expect(changed_route()).toEqual(init())
    })

    test("handles both platform shortcuts and leaves ordinary typing alone", () => {
        const preventDefault = vi.fn()
        const event = {
            key: "k",
            ctrlKey: false,
            metaKey: false,
            altKey: false,
            repeat: false,
            isComposing: false,
            defaultPrevented: false,
            preventDefault,
        }
        expect(Option.isNone(handle_keyboard_event(event))).toBe(true)
        expect(preventDefault).not.toHaveBeenCalled()
        expect(
            Option.isSome(handle_keyboard_event({ ...event, ctrlKey: true }))
        ).toBe(true)
        expect(
            Option.isSome(handle_keyboard_event({ ...event, metaKey: true }))
        ).toBe(true)
        expect(
            Option.isNone(
                handle_keyboard_event({ ...event, ctrlKey: true, repeat: true })
            )
        ).toBe(true)
        expect(preventDefault).toHaveBeenCalledTimes(2)
    })
})
