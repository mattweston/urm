import { Option } from "effect"
import { Scene } from "foldkit"
import { Url } from "foldkit/url"
import { test } from "vitest"
import { urm_marketing_landing_page } from "@urm/domain/landing-page-presets"
import { init, update } from "./design.update.ts"
import { mainLayoutView } from "./design.view.ts"

test("layout preview retains marketing visuals and interactive FAQs without editor controls", () => {
    const url = Url.make({
        protocol: "https:",
        host: "urm.test",
        port: Option.none(),
        pathname: "/design/layouts/main-layout",
        search: Option.none(),
        hash: Option.none(),
    })
    const model: Parameters<typeof update>[0] = {
        ...init(url)[0],
        preview_page_id: Option.some("home"),
        pages: [
            {
                id: "home",
                domain_id: "domain",
                owner_id: "domain",
                document_id: "home",
                navigation_label: "Home",
                is_homepage: true,
                show_in_navigation: false,
                order_position: 0,
                updated_at: 0,
            },
        ],
        preview_document: Option.some({
            id: "home",
            title: "Marketing",
            kind: "basic",
            content: JSON.stringify(urm_marketing_landing_page),
            content_type: "landing_json",
            slug: null,
            published: true,
        }),
    }
    Scene.scene(
        {
            update: (
                model: Parameters<typeof update>[0],
                message: Parameters<typeof update>[1]
            ) => {
                const [next, commands] = update(model, message)
                return { model: next, commands }
            },
            view: mainLayoutView,
        },
        Scene.given(model),
        Scene.expect(Scene.selector("#home")).toExist(),
        Scene.expect(Scene.selector('img[alt="Stripe"]')).toExist(),
        Scene.expect(Scene.selector("#landing-copy-hero_title")).toHaveValue(
            "Your marketing website and your business data, in one system."
        ),
        Scene.expect(Scene.role("switch", { name: "Edit page" })).toBeAbsent(),
        Scene.click(Scene.role("button", { name: "Who is URM for?" })),
        Scene.expect(
            Scene.role("button", { name: "Who is URM for?" })
        ).toHaveAttr("aria-expanded", "true")
    )
})

test("Events preview distinguishes exclusion, unavailable data and no published events", () => {
    const url = Url.make({
        protocol: "https:",
        host: "urm.test",
        port: Option.none(),
        pathname: "/design/layouts/main-layout",
        search: Option.none(),
        hash: Option.none(),
    })
    const base: Parameters<typeof update>[0] = {
        ...init(url)[0],
        preview_module_id: Option.some("events"),
    }
    const cases: ReadonlyArray<{
        state: "excluded" | "unavailable" | "included"
        text: string
    }> = [
        {
            state: "excluded",
            text: "Events is excluded from this site. In Web → Pages, select Add to Pages for Events.",
        },
        {
            state: "unavailable",
            text: "Events could not be loaded. Reload the preview to retry.",
        },
        { state: "included", text: "No published events." },
    ]
    for (const item of cases) {
        Scene.scene(
            {
                update: (
                    model: Parameters<typeof update>[0],
                    message: Parameters<typeof update>[1]
                ) => {
                    const [next, commands] = update(model, message)
                    return { model: next, commands }
                },
                view: mainLayoutView,
            },
            Scene.given({
                ...base,
                preview_module_id: Option.some("events"),
                preview_events_state: item.state,
            }),
            Scene.expect(Scene.text(item.text)).toExist()
        )
    }
})

test("event preview shows authenticated upload images in the list and detail", () => {
    const url = Url.make({
        protocol: "https:",
        host: "urm.test",
        port: Option.none(),
        pathname: "/design/layouts/main-layout",
        search: Option.none(),
        hash: Option.none(),
    })
    const image_url =
        "/api/uploads/workspace/events/12345678-1234-1234-1234-123456789abc"
    const event = {
        id: "event-1",
        title: "Dinner",
        description: "Dinner details",
        date: Date.UTC(2026, 9, 1),
        start_time: "18:30",
        end_time: "",
        venue_name: "Hall",
        venue_url: "",
        latitude: "unavailable",
        longitude: "unavailable",
        tickets_url: "",
        image_url,
        published: true,
    }
    const model: Parameters<typeof update>[0] = {
        ...init(url)[0],
        preview_module_id: Option.some("events"),
        preview_events_state: "included",
        preview_events: [event],
    }
    const app = {
        update: (
            model: Parameters<typeof update>[0],
            message: Parameters<typeof update>[1]
        ) => {
            const [next, commands] = update(model, message)
            return { model: next, commands }
        },
        view: mainLayoutView,
    }
    Scene.scene(
        app,
        Scene.given(model),
        Scene.expect(Scene.selector('img[alt="Dinner"]')).toHaveAttr(
            "src",
            image_url
        )
    )
    Scene.scene(
        app,
        Scene.given({ ...model, preview_event_id: Option.some(event.id) }),
        Scene.expect(Scene.selector('img[alt="Dinner"]')).toHaveAttr(
            "src",
            image_url
        )
    )
    for (const unsafe_url of [
        "javascript:alert(1)",
        "//untrusted.test/image.png",
        "/api/uploads/../image.png",
        "",
    ]) {
        const unsafe_model = {
            ...model,
            preview_events: [{ ...event, image_url: unsafe_url }],
        }
        Scene.scene(
            app,
            Scene.given(unsafe_model),
            Scene.expect(Scene.selector('img[alt="Dinner"]')).toBeAbsent()
        )
        Scene.scene(
            app,
            Scene.given({
                ...unsafe_model,
                preview_event_id: Option.some(event.id),
            }),
            Scene.expect(Scene.selector('img[alt="Dinner"]')).toBeAbsent()
        )
    }
})
