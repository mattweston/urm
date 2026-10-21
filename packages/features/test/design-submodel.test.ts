import { Option } from "effect"
import { Url } from "foldkit/url"
import { describe, expect, test } from "vitest"

import * as Design from "../src/design/submodel.ts"
import * as SocialLinks from "../src/media/social-links/index.ts"

const url = Url.make({
    protocol: "http:",
    host: "urm.test",
    port: Option.none(),
    pathname: "/design",
    search: Option.none(),
    hash: Option.none(),
})

const main_layout_url = Url.make({
    protocol: "http:",
    host: "urm.test",
    port: Option.none(),
    pathname: "/design/layouts/main-layout",
    search: Option.none(),
    hash: Option.none(),
})

const site = Design.DesignSite.make({
    id: "site-1",
    domain_id: "domain-1",
    name: "Main site",
    slug: "main",
    purpose: "production",
    status: "draft",
    access: "public",
    updated_at: 1,
})

const documents = [
    Design.DesignDocument.make({
        id: "document-1",
        title: "Home",
        kind: "basic",
        slug: "home",
        published: true,
    }),
    Design.DesignDocument.make({
        id: "document-2",
        title: "About",
        kind: "basic",
        slug: "about",
        published: false,
    }),
]

const pages = [
    Design.DesignPage.make({
        id: "page-1",
        domain_id: "domain-1",
        owner_id: "site-1",
        document_id: "document-1",
        navigation_label: "Home",
        is_homepage: true,
        show_in_navigation: true,
        order_position: 0,
        updated_at: 1,
    }),
    Design.DesignPage.make({
        id: "page-2",
        domain_id: "domain-1",
        owner_id: "site-1",
        document_id: "document-2",
        navigation_label: "About",
        is_homepage: false,
        show_in_navigation: true,
        order_position: 1,
        updated_at: 1,
    }),
]

describe("design site composition", () => {
    test("switches the preview between modules and pages", () => {
        const initial = {
            ...Design.init(main_layout_url)[0],
            pages,
        }
        const with_events = Design.with_preview_events(initial, [
            Design.DesignPreviewEvent.make({
                id: "event-1",
                title: "Open studio",
                description: "An evening opening.",
                date: Date.UTC(2026, 8, 12),
                start_time: "18:00",
                end_time: "20:00",
                venue_name: "Gallery",
                venue_url: "",
                latitude: "51.5",
                longitude: "-0.12",
                tickets_url: "",
                image_url: "",
                published: true,
            }),
        ])
        const with_posts = Design.with_preview_blog_posts(with_events, [
            Design.DesignPreviewBlogPost.make({
                id: "post-1",
                title: "Studio notes",
                slug: "studio-notes",
                published: true,
            }),
        ])
        const [blog_selected] = Design.update(
            with_posts,
            Design.SelectedPreviewModule({ module_id: "blog" })
        )
        expect(Option.getOrUndefined(blog_selected.preview_module_id)).toBe(
            "blog"
        )
        expect(blog_selected.preview_blog_posts).toHaveLength(1)

        const [events_selected] = Design.update(
            blog_selected,
            Design.SelectedPreviewModule({ module_id: "events" })
        )

        expect(Option.getOrUndefined(events_selected.preview_module_id)).toBe(
            "events"
        )
        expect(events_selected.preview_events).toHaveLength(1)
        expect(Option.isNone(events_selected.preview_page_id)).toBe(true)

        const [event_selected, weather_commands] = Design.update(
            events_selected,
            Design.SelectedPreviewEvent({ event_id: "event-1" })
        )
        expect(Option.getOrUndefined(event_selected.preview_event_id)).toBe(
            "event-1"
        )
        expect(event_selected.preview_event_weather._tag).toBe("Loading")
        expect(weather_commands.map((command) => command.name)).toEqual([
            "LoadEventWeather",
        ])

        const [event_index] = Design.update(
            event_selected,
            Design.SelectedPreviewEventsIndex()
        )
        expect(Option.isNone(event_index.preview_event_id)).toBe(true)

        const [page_selected] = Design.update(
            event_index,
            Design.SelectedPreviewPage({ page_id: "page-1" })
        )
        expect(Option.isNone(page_selected.preview_module_id)).toBe(true)
        expect(Option.getOrUndefined(page_selected.preview_page_id)).toBe(
            "page-1"
        )
    })

    test("saves appearance explicitly, retains drafts and ignores stale completions", () => {
        const initial = {
            ...Design.init(main_layout_url)[0],
            selected_owner_id: Option.some(site.id),
        }
        const [themed] = Design.update(
            initial,
            Design.ChangedSiteTheme({ value: "nord" })
        )
        const [with_site_title] = Design.update(
            themed,
            Design.ChangedSiteTitle({ value: "Editorial title" })
        )
        const [dark] = Design.update(
            with_site_title,
            Design.ChangedSiteAppearance({ value: "dark" })
        )
        const [with_title] = Design.update(
            dark,
            Design.ChangedShowSiteTitle({ value: true })
        )
        const [refreshed] = Design.update(
            with_title,
            Design.LoadedWorkspace({
                owner_id: site.id,
                documents: [],
                pages: [],
                has_layout: false,
                social_links: [],
                logo_light_url: null,
                logo_dark_url: null,
                theme_id: "default",
                appearance: "system",
            })
        )
        expect(refreshed.theme_id).toBe("nord")
        const [saving, commands] = Design.update(
            refreshed,
            Design.RequestedSaveSiteAppearance()
        )
        expect(commands[0]?.name).toBe("SaveSiteAppearance")
        expect(commands[0]?.args).toEqual({
            owner_id: site.id,
            theme_id: "nord",
            appearance: "dark",
            site_title: "Editorial title",
            show_site_title: true,
        })
        expect(saving.appearance_saving).toBe(true)
        expect(
            Design.update(saving, Design.RequestedSaveSiteAppearance())[1]
        ).toEqual([])
        const [saved] = Design.update(
            saving,
            Design.SavedSiteAppearance({
                owner_id: site.id,
                theme_id: "nord",
                appearance: "dark",
                site_title: "Editorial title",
                show_site_title: true,
            })
        )
        expect(saved.appearance_dirty).toBe(false)
        expect(saved.appearance_saved).toBe(true)
        const [switched] = Design.update(
            saving,
            Design.AssignedMainLayoutOwner({ owner_id: "site-2" })
        )
        expect(
            Design.update(
                switched,
                Design.SavedSiteAppearance({
                    owner_id: site.id,
                    theme_id: "nord",
                    appearance: "dark",
                    site_title: "Editorial title",
                    show_site_title: true,
                })
            )[0]
        ).toEqual(switched)
        expect(
            Design.update(
                initial,
                Design.ChangedSiteTheme({ value: "invalid" })
            )[0]
        ).toEqual(initial)
    })
    test("renders the default layout without assigning the first site", () => {
        const model = Design.with_sites(Design.init(main_layout_url)[0], [site])

        expect(model.is_main_layout_route).toBe(true)
        expect(Option.isNone(model.selected_owner_id)).toBe(true)
        expect(model.social_links.drafts).toEqual(
            SocialLinks.default_social_links
        )
    })

    test("preserves a default layout draft when assigning it to a site", () => {
        const initial = Design.with_sites(Design.init(main_layout_url)[0], [
            site,
        ])
        const [started_editing] = Design.update(
            initial,
            Design.GotSocialLinksMessage({
                message: SocialLinks.ClickedEditSocialLinks(),
            })
        )
        const [editing] = Design.update(
            started_editing,
            Design.GotSocialLinksMessage({
                message: SocialLinks.ChangedSocialLinkUrl({
                    platform: "Instagram",
                    url: "https://instagram.com/urm",
                }),
            })
        )
        const [assigned] = Design.update(
            editing,
            Design.AssignedMainLayoutOwner({ owner_id: site.id })
        )
        const [loaded] = Design.update(
            assigned,
            Design.LoadedWorkspace({
                owner_id: site.id,
                documents,
                pages,
                has_layout: false,
                social_links: [],
                logo_light_url: null,
                logo_dark_url: null,
            })
        )

        expect(Option.getOrNull(loaded.selected_owner_id)).toBe(site.id)
        expect(loaded.social_links.drafts[1]?.url).toBe(
            "https://instagram.com/urm"
        )
    })

    test("loads an existing site layout when the default was not edited", () => {
        const initial = Design.with_sites(Design.init(main_layout_url)[0], [
            site,
        ])
        const [assigned] = Design.update(
            initial,
            Design.AssignedMainLayoutOwner({ owner_id: site.id })
        )
        const [loaded] = Design.update(
            assigned,
            Design.LoadedWorkspace({
                owner_id: site.id,
                documents,
                pages,
                has_layout: true,
                social_links: [
                    {
                        platform: "Facebook",
                        url: "https://facebook.com/urm",
                    },
                ],
                logo_light_url: null,
                logo_dark_url: null,
            })
        )

        expect(loaded.social_links.drafts[0]?.url).toBe(
            "https://facebook.com/urm"
        )
    })

    test("loads theme logos and restores the public fallback", () => {
        const initial = Design.with_sites(Design.init(main_layout_url)[0], [
            site,
        ])
        const [assigned] = Design.update(
            initial,
            Design.AssignedMainLayoutOwner({ owner_id: site.id })
        )
        const [loaded] = Design.update(
            assigned,
            Design.LoadedWorkspace({
                owner_id: site.id,
                documents,
                pages,
                has_layout: false,
                social_links: [],
                logo_light_url: "https://cdn.example.com/logo-light.svg",
                logo_dark_url: null,
            })
        )
        const [removed] = Design.update(
            loaded,
            Design.RemovedLayoutLogo({ variant: "light" })
        )

        expect(loaded.logo_light_url).toBe(
            "https://cdn.example.com/logo-light.svg"
        )
        expect(loaded.logo_dark_url).toBe(Design.DEFAULT_LOGO_DARK_URL)
        expect(loaded.has_custom_logo_light).toBe(true)
        expect(removed.logo_light_url).toBe(Design.DEFAULT_LOGO_LIGHT_URL)
        expect(removed.has_custom_logo_light).toBe(false)
    })

    test("loads, replaces, and removes theme favicons", () => {
        const initial = Design.with_sites(Design.init(url)[0], [site])
        const [loaded] = Design.update(
            initial,
            Design.LoadedWorkspace({
                owner_id: site.id,
                documents,
                pages,
                has_layout: true,
                social_links: [],
                logo_light_url: null,
                logo_dark_url: null,
                favicon_light_url: "https://cdn.example.com/favicon-light.svg",
                favicon_dark_url: null,
            })
        )
        const [uploaded] = Design.update(
            loaded,
            Design.UploadedLayoutFavicon({
                variant: "dark",
                url: "https://cdn.example.com/favicon-dark.svg",
            })
        )
        const [removed] = Design.update(
            uploaded,
            Design.RemovedLayoutFavicon({ variant: "light" })
        )

        expect(loaded.has_custom_favicon_light).toBe(true)
        expect(uploaded.favicon_dark_url).toContain("favicon-dark.svg")
        expect(removed.favicon_light_url).toBe(Design.DEFAULT_FAVICON_URL)
        expect(removed.has_custom_favicon_light).toBe(false)
    })

    test("selects the first site and loads only its workspace", () => {
        const model = Design.with_sites(Design.init(url)[0], [site])
        const [loaded] = Design.update(
            model,
            Design.LoadedWorkspace({
                owner_id: site.id,
                documents,
                pages,
                has_layout: false,
                social_links: [],
                logo_light_url: null,
                logo_dark_url: null,
            })
        )

        expect(Option.getOrNull(loaded.selected_owner_id)).toBe(site.id)
        expect(loaded.is_loading).toBe(false)
        expect(Option.getOrNull(loaded.preview_page_id)).toBe("page-1")
        expect(loaded.pages.map((page) => page.id)).toEqual([
            "page-1",
            "page-2",
        ])
    })

    test("keeps preview content aligned with the selected site page", () => {
        const initial = Design.with_sites(Design.init(url)[0], [site])
        const [loaded] = Design.update(
            initial,
            Design.LoadedWorkspace({
                owner_id: site.id,
                documents,
                pages,
                has_layout: false,
                social_links: [],
                logo_light_url: null,
                logo_dark_url: null,
            })
        )
        const [with_preview] = Design.update(
            loaded,
            Design.LoadedPreviewDocument({
                page_id: "page-1",
                document: Design.DesignPreviewDocument.make({
                    id: "document-1",
                    title: "Home",
                    kind: "basic",
                    slug: "home",
                    published: true,
                    content: "Home content",
                    content_type: "text",
                }),
            })
        )
        const [selected] = Design.update(
            with_preview,
            Design.SelectedPreviewPage({ page_id: "page-2" })
        )

        expect(
            Option.getOrNull(
                Option.map(
                    with_preview.preview_document,
                    (document) => document.content
                )
            )
        ).toBe("Home content")
        expect(Option.isNone(selected.preview_document)).toBe(true)
    })

    test("parses Markdown on demand without accepting stale results", () => {
        const initial = Design.with_sites(Design.init(url)[0], [site])
        const [loaded] = Design.update(
            initial,
            Design.LoadedWorkspace({
                owner_id: site.id,
                documents,
                pages,
                has_layout: false,
                social_links: [],
                logo_light_url: null,
                logo_dark_url: null,
            })
        )
        const [with_preview, commands] = Design.update(
            loaded,
            Design.LoadedPreviewDocument({
                page_id: "page-1",
                document: Design.DesignPreviewDocument.make({
                    id: "document-1",
                    title: "Home",
                    kind: "basic",
                    slug: "home",
                    published: true,
                    content: "# Home",
                    content_type: "markdown",
                }),
            })
        )
        const [selected] = Design.update(
            with_preview,
            Design.SelectedPreviewPage({ page_id: "page-2" })
        )
        const [after_stale_failure] = Design.update(
            selected,
            Design.FailedPreviewMarkdown({
                page_id: "page-1",
                error: "stale parse",
            })
        )

        expect(commands.map((command) => command.name)).toEqual([
            "ParseDesignMarkdown",
        ])
        expect(Option.isNone(with_preview.preview_markdown)).toBe(true)
        expect(after_stale_failure).toBe(selected)
    })

    test("reorders pages optimistically and emits persistence positions", () => {
        const model = {
            ...Design.with_sites(Design.init(url)[0], [site]),
            documents,
            pages,
        }
        const [updated, commands] = Design.update(
            model,
            Design.RequestedMovePage({
                page_id: "page-2",
                direction: "up",
            })
        )

        expect(updated.pages.map((page) => page.id)).toEqual([
            "page-2",
            "page-1",
        ])
        expect(commands.map((command) => command.name)).toEqual([
            "ReorderDesignPages",
        ])
    })

    test("keeps one homepage when it changes", () => {
        const model = {
            ...Design.with_sites(Design.init(url)[0], [site]),
            documents,
            pages,
        }
        const [updated, commands] = Design.update(
            model,
            Design.RequestedSetHomepage({ page_id: "page-2" })
        )

        expect(
            updated.pages
                .filter((page) => page.is_homepage)
                .map((page) => page.id)
        ).toEqual(["page-2"])
        expect(commands.map((command) => command.name)).toEqual([
            "UpdateDesignPage",
        ])
    })
})
