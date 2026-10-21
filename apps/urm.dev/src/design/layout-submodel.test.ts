import { Option, Schema as S } from "effect"
import { Url } from "foldkit/url"
import { describe, expect, test } from "vitest"

import {
    DomainId,
    Page,
    PageId,
    PublicationNavigationItem,
    PublicationNavigationItemId,
    PublicationRouteModule,
    SubdomainId,
} from "./records.ts"
import * as FeatureDesign from "@urm/features/design/submodel"

import * as Design from "./layout-legacy.ts"

const domain_id = S.decodeUnknownSync(DomainId)(
    "j1700000000000000000000000000001"
)
const subdomain_id = S.decodeUnknownSync(SubdomainId)(
    "j2700000000000000000000000000001"
)
const navigation_item_id = S.decodeUnknownSync(PublicationNavigationItemId)(
    "j3700000000000000000000000000001"
)
const landing_page_id = S.decodeUnknownSync(PageId)(
    "j4700000000000000000000000000001"
)
const deleted_page_id = S.decodeUnknownSync(PageId)(
    "j5700000000000000000000000000001"
)
const excluded_events = S.decodeUnknownSync(PublicationRouteModule)({
    _id: "j6700000000000000000000000000001",
    _creationTime: 1,
    domain_id,
    module_id: "events",
    included: false,
    created_at: 1,
    updated_at: 1,
})
const excluded_blog = S.decodeUnknownSync(PublicationRouteModule)({
    _id: "j7700000000000000000000000000001",
    _creationTime: 1,
    domain_id,
    module_id: "blog",
    included: false,
    created_at: 1,
    updated_at: 1,
})
const browser_url = Url.make({
    protocol: "http:",
    host: "urm.test",
    port: Option.some("1420"),
    pathname: "/design/layouts/main-layout",
    search: Option.none(),
    hash: Option.none(),
})
const domain = {
    _id: domain_id,
    name: "Example",
    slug: "example",
    updated_at: 1,
}
const subdomains: Parameters<typeof Design.with_publications>[2] = [
    {
        id: globalThis.String(subdomain_id),
        domain_id: globalThis.String(domain_id),
        name: "Docs",
        slug: "docs",
        kind: "documentation",
        status: "live",
        access: "public",
        updated_at: 1,
    },
]

const ready_model = () => {
    const initial = Design.with_publications(
        Design.init(browser_url),
        Option.some(domain),
        subdomains
    )
    const [with_pages] = Design.update(
        initial,
        Design.LoadedPublicationLayoutPages({ pages: [] }),
        Option.some(domain_id),
        subdomains
    )
    return Design.update(
        with_pages,
        Design.LoadedPublicationLayout({ layout: null }),
        Option.some(domain_id),
        subdomains
    )[0]
}

describe("domain-owned main layout", () => {
    test("provides published blog posts to the publication preview", () => {
        const model = Design.with_blog_posts(ready_model(), [
            {
                id: "post-1",
                title: "Studio notes",
                slug: "studio-notes",
                published: true,
            },
        ])

        expect(model.editor.preview_blog_posts).toEqual([
            {
                id: "post-1",
                title: "Studio notes",
                slug: "studio-notes",
                published: true,
            },
        ])
    })

    test("removes excluded Blog posts from the reactive publication preview", () => {
        const [with_membership] = Design.update(
            ready_model(),
            Design.LoadedPublicationRouteModules({
                modules: [excluded_blog],
            }),
            Option.some(domain_id),
            subdomains
        )
        const model = Design.with_blog_posts(with_membership, [
            {
                id: "post-1",
                title: "Studio notes",
                slug: "studio-notes",
                published: true,
            },
        ])

        expect(model.editor.preview_blog_posts).toEqual([])
    })

    test("provides structured events to the publication preview", () => {
        const model = Design.with_events(ready_model(), [
            {
                id: "event-1",
                title: "Open studio",
                description: "An evening opening.",
                date: Date.UTC(2026, 8, 12),
                start_time: "18:00",
                end_time: "20:00",
                venue_name: "Gallery",
                venue_url: "",
                latitude: "",
                longitude: "",
                tickets_url: "",
                image_url: "",
                published: true,
                updated_at: 1,
            },
        ])

        expect(model.editor.preview_events).toEqual([
            {
                id: "event-1",
                title: "Open studio",
                description: "An evening opening.",
                date: Date.UTC(2026, 8, 12),
                start_time: "18:00",
                end_time: "20:00",
                venue_name: "Gallery",
                venue_url: "",
                latitude: "",
                longitude: "",
                tickets_url: "",
                image_url: "",
                published: true,
            },
        ])
    })

    test("removes excluded Events from the reactive publication preview", () => {
        const [with_membership] = Design.update(
            ready_model(),
            Design.LoadedPublicationRouteModules({
                modules: [excluded_events],
            }),
            Option.some(domain_id),
            subdomains
        )
        const model = Design.with_events(with_membership, [
            {
                id: "event-1",
                title: "Open studio",
                description: "An evening opening.",
                date: Date.UTC(2026, 8, 12),
                start_time: "18:00",
                end_time: "20:00",
                venue_name: "Gallery",
                venue_url: "",
                latitude: "",
                longitude: "",
                tickets_url: "",
                image_url: "",
                published: true,
                updated_at: 1,
            },
        ])

        expect(model.editor.preview_events).toEqual([])
    })

    test("defaults to the main domain and resolves a selected subdomain", () => {
        const model = ready_model()
        expect(
            Option.getOrUndefined(
                Design.owner_args(model, Option.some(domain_id), subdomains)
            )
        ).toEqual({ domain_id, subdomain_id: null })

        const [selected] = Design.update(
            model,
            Design.GotLayoutEditorMessage({
                message: FeatureDesign.AssignedMainLayoutOwner({
                    owner_id: globalThis.String(subdomain_id),
                }),
            }),
            Option.some(domain_id),
            subdomains
        )

        expect(
            Option.getOrUndefined(
                Design.owner_args(selected, Option.some(domain_id), subdomains)
            )
        ).toEqual({ domain_id, subdomain_id })
    })

    test("saves appearance through the publication layout contract", () => {
        const model = ready_model()
        const [changed] = Design.update(
            model,
            Design.GotLayoutEditorMessage({
                message: FeatureDesign.ChangedSiteAppearance({ value: "dark" }),
            }),
            Option.some(domain_id),
            subdomains
        )
        const [, commands] = Design.update(
            changed,
            Design.GotLayoutEditorMessage({
                message: FeatureDesign.RequestedSaveSiteAppearance(),
            }),
            Option.some(domain_id),
            subdomains
        )

        expect(commands).toHaveLength(1)
        expect(commands[0]?.name).toBe("SavePublicationLayout")
    })

    test("initializes explicit header navigation for a legacy layout", () => {
        const [model] = Design.update(
            ready_model(),
            Design.LoadedPublicationNavigation({ items: [] }),
            Option.some(domain_id),
            subdomains
        )
        const [saving, commands] = Design.update(
            model,
            Design.RequestedInitializePublicationNavigation(),
            Option.some(domain_id),
            subdomains
        )

        expect(saving.navigation_saving).toBe(true)
        expect(commands).toHaveLength(1)
        expect(commands[0]?.name).toBe("InitializePublicationNavigation")
    })

    test("persists visibility changes for a navigation item", () => {
        const item = S.decodeUnknownSync(PublicationNavigationItem)({
            _id: navigation_item_id,
            _creationTime: 1,
            domain_id,
            target: { _tag: "module", module_id: "blog" },
            label: "Blog",
            visible: true,
            order_position: 0,
            created_at: 1,
            updated_at: 1,
        })
        const [loaded] = Design.update(
            ready_model(),
            Design.LoadedPublicationNavigation({ items: [item] }),
            Option.some(domain_id),
            subdomains
        )
        expect(
            Option.getOrUndefined(loaded.editor.preview_navigation)?.map(
                (navigation_item) => navigation_item.label
            )
        ).toEqual(["Blog"])
        const [saving, commands] = Design.update(
            loaded,
            Design.RequestedTogglePublicationNavigation({
                navigation_item_id,
            }),
            Option.some(domain_id),
            subdomains
        )

        expect(saving.navigation_items[0]?.visible).toBe(false)
        expect(
            Option.getOrUndefined(saving.editor.preview_navigation)?.[0]
                ?.visible
        ).toBe(false)
        expect(commands).toHaveLength(1)
        expect(commands[0]?.name).toBe("SavePublicationNavigationItem")
    })

    test("adds Events to explicit header navigation", () => {
        const [model] = Design.update(
            ready_model(),
            Design.LoadedPublicationNavigation({ items: [] }),
            Option.some(domain_id),
            subdomains
        )
        const [saving, commands] = Design.update(
            model,
            Design.RequestedAddEventsNavigation(),
            Option.some(domain_id),
            subdomains
        )

        expect(saving.navigation_saving).toBe(true)
        expect(commands).toHaveLength(1)
        expect(commands[0]?.name).toBe("AddEventsPublicationNavigation")
    })

    test("reconciles stale navigation after pages are replaced", () => {
        const landing = S.decodeUnknownSync(Page)({
            _id: landing_page_id,
            _creationTime: 1,
            domain_id,
            title: "Landing page",
            content: JSON.stringify({ schema_version: 1, blocks: [] }),
            content_type: "landing_json",
            navigation_label: "Landing page",
            show_in_navigation: true,
            order_position: 0,
            is_homepage: true,
            publication_state: "draft",
            noindex: true,
            created_at: 1,
            updated_at: 1,
        })
        const stale_item = S.decodeUnknownSync(PublicationNavigationItem)({
            _id: navigation_item_id,
            _creationTime: 1,
            domain_id,
            target: { _tag: "page", page_id: deleted_page_id },
            label: "Page 1",
            visible: true,
            order_position: 0,
            created_at: 1,
            updated_at: 1,
        })
        const [with_pages] = Design.update(
            ready_model(),
            Design.LoadedPublicationLayoutPages({ pages: [landing] }),
            Option.some(domain_id),
            subdomains
        )
        const [synchronizing, commands] = Design.update(
            with_pages,
            Design.LoadedPublicationNavigation({ items: [stale_item] }),
            Option.some(domain_id),
            subdomains
        )

        expect(synchronizing.navigation_saving).toBe(true)
        expect(commands).toHaveLength(1)
        expect(commands[0]?.name).toBe("InitializePublicationNavigation")
    })
})
