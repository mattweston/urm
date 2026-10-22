import { Option } from "effect"
import { Url } from "foldkit/url"
import { describe, expect, test } from "vitest"

import {
    chat_href,
    content_documents_href,
    content_href,
    content_bookmarks_href,
    content_new_href,
    content_templates_href,
    designIdeasHref,
    documentsBlogDraftsHref,
    documentsBlogHref,
    documentsBlogNewHref,
    documentsBlogPublishedHref,
    documentsFeaturePath,
    finance_href,
    legacy_content_replacement_href,
    legacy_mail_templates_replacement_href,
    legacy_marketing_replacement_href,
    legacy_pages_replacement_href,
    mailFeaturePath,
    media_streaming_href,
    routeForUrl,
    sidebarRouteTag,
    social_href,
    web_href,
    web_pages_href,
    web_pages_new_href,
    web_publishing_href,
} from "./route.ts"

const url_with_hash = (path: string) =>
    Url.make({
        protocol: "http:",
        host: "urm.test",
        port: Option.some("1420"),
        pathname: path,
        search: Option.none(),
        hash: Option.none(),
    })

describe("desktop routes", () => {
    test.each([
        ["/content", "Content", content_href()],
        ["/content/new", "ContentNew", content_new_href()],
        ["/content/documents", "ContentDocuments", content_documents_href()],
        ["/content/bookmarks", "ContentBookmarks", content_bookmarks_href()],
        ["/content/templates", "ContentTemplates", content_templates_href()],
    ])("routes Content at %s", (path, route_tag, href) => {
        const route = routeForUrl(url_with_hash(path))

        expect(route).toEqual({
            _tag: "Content",
            content_path: path,
            content_search: "",
        })
        expect(sidebarRouteTag(route)).toBe(route_tag)
        expect(href).toBe(path)
    })

    test("keeps document creation and canonical items inside Content", () => {
        const creation = routeForUrl(url_with_hash("/content/documents/new"))
        const item = routeForUrl(
            url_with_hash("/content/document/j4700000000000000000000000000001")
        )

        expect(creation._tag).toBe("Content")
        expect(item._tag).toBe("Content")
        expect(sidebarRouteTag(creation)).toBe("Content")
        expect(sidebarRouteTag(item)).toBe("Content")
    })

    test("routes canonical Content items with their query state", () => {
        const route = routeForUrl(
            Url.make({
                protocol: "http:",
                host: "urm.test",
                port: Option.some("1420"),
                pathname: "/content/web/j4700000000000000000000000000001",
                search: Option.some("?mode=edit"),
                hash: Option.none(),
            })
        )

        expect(route).toEqual({
            _tag: "Content",
            content_path: "/content/web/j4700000000000000000000000000001",
            content_search: "?mode=edit",
        })
        expect(sidebarRouteTag(route)).toBe("Content")
        expect(Option.isNone(documentsFeaturePath(route))).toBe(true)
    })

    test("routes canonical email drafts through Content and the Mail data adapter", () => {
        const route = routeForUrl(
            Url.make({
                protocol: "http:",
                host: "urm.test",
                port: Option.some("1420"),
                pathname: "/content/email/j8700000000000000000000000000001",
                search: Option.some("?mode=edit"),
                hash: Option.none(),
            })
        )

        expect(route._tag).toBe("Content")
        expect(sidebarRouteTag(route)).toBe("ContentEmail")
        expect(mailFeaturePath(route)).toEqual(Option.some("/mail/newsletter"))
    })

    test.each([
        ["/pages", "/web/pages"],
        ["/pages/", "/web/pages"],
        ["/pages/new", "/web/pages/new"],
        ["/pages/subdomains/docs", "/web/pages/subdomains/docs"],
        ["/pages/bookmarks", "/content/bookmarks"],
    ])("replaces the legacy Pages URL %s", (pathname, expected) => {
        expect(legacy_pages_replacement_href(url_with_hash(pathname))).toEqual(
            Option.some(expected)
        )
    })

    test("preserves query and fragment state in a legacy Pages replacement", () => {
        const url = Url.make({
            protocol: "http:",
            host: "urm.test",
            port: Option.some("1420"),
            pathname: "/pages/subdomains/docs/new",
            search: Option.some("?kind=document"),
            hash: Option.some("#title"),
        })

        expect(legacy_pages_replacement_href(url)).toEqual(
            Option.some("/web/pages/subdomains/docs/new?kind=document#title")
        )
    })

    test("does not replace canonical Web or Content routes", () => {
        expect(
            Option.isNone(
                legacy_pages_replacement_href(url_with_hash("/web/pages"))
            )
        ).toBe(true)
        expect(
            Option.isNone(
                legacy_pages_replacement_href(
                    url_with_hash("/content/bookmarks")
                )
            )
        ).toBe(true)
    })

    test("replaces the legacy Documents URL and preserves URL state", () => {
        const url = Url.make({
            protocol: "http:",
            host: "urm.test",
            port: Option.some("1420"),
            pathname: "/documents/",
            search: Option.some("?view=recent"),
            hash: Option.some("#document-list"),
        })

        expect(legacy_content_replacement_href(url)).toEqual(
            Option.some("/content/documents?view=recent#document-list")
        )
        expect(
            Option.isNone(
                legacy_content_replacement_href(
                    url_with_hash("/content/documents")
                )
            )
        ).toBe(true)
    })

    test("replaces the Mail template gallery with the email template catalog", () => {
        const url = Url.make({
            protocol: "http:",
            host: "urm.test",
            port: Option.some("1420"),
            pathname: "/mail/templates/",
            search: Option.some("?capability=transactional&kind=web"),
            hash: Option.some("#templates"),
        })

        expect(legacy_mail_templates_replacement_href(url)).toEqual(
            Option.some(
                "/content/templates?capability=transactional&kind=email#templates"
            )
        )
    })

    test("retains Content catalog filters in the route", () => {
        const route = routeForUrl(
            Url.make({
                protocol: "http:",
                host: "urm.test",
                port: Option.some("1420"),
                pathname: "/content/templates",
                search: Option.some("?kind=email&provenance=system"),
                hash: Option.none(),
            })
        )

        expect(route).toEqual({
            _tag: "Content",
            content_path: "/content/templates",
            content_search: "?kind=email&provenance=system",
        })
    })

    test.each([
        ["/web", "WebPages", web_href()],
        ["/web/pages", "WebPages", web_pages_href()],
        ["/web/pages/new", "WebPagesNew", web_pages_new_href()],
        ["/web/publishing", "WebPublishing", web_publishing_href()],
    ])("routes the Web workspace at %s", (path, route_tag, href) => {
        const route = routeForUrl(url_with_hash(path))

        expect(route).toEqual({ _tag: "Web", web_path: path })
        expect(sidebarRouteTag(route)).toBe(route_tag)
        expect(href).toBe(path)
    })

    test.each(["/finance", "/finance/"])(
        "routes Finance through its sidebar destination at %s",
        (path) => {
            const route = routeForUrl(url_with_hash(path))

            expect(route).toEqual({ _tag: "Finance" })
            expect(sidebarRouteTag(route)).toBe("Finance")
            expect(finance_href()).toBe("/finance")
        }
    )

    test("keeps unimplemented Finance subroutes on the fallback route", () => {
        expect(routeForUrl(url_with_hash("/finance/transactions"))).toEqual({
            _tag: "Dashboard",
        })
    })

    test.each(["/social", "/social/"])(
        "routes Social through its sidebar destination at %s",
        (path) => {
            const route = routeForUrl(url_with_hash(path))

            expect(route).toEqual({ _tag: "Social" })
            expect(sidebarRouteTag(route)).toBe("Social")
            expect(social_href()).toBe("/social")
        }
    )

    test.each(["/chat", "/chat/"])(
        "routes Chat through its sidebar destination at %s",
        (path) => {
            const route = routeForUrl(url_with_hash(path))

            expect(route).toEqual({ _tag: "Chat" })
            expect(sidebarRouteTag(route)).toBe("Chat")
            expect(chat_href()).toBe("/chat")
        }
    )

    test.each(["/design/logo", "/design/logo/"])(
        "selects Logo at %s",
        (path) => {
            expect(sidebarRouteTag(routeForUrl(url_with_hash(path)))).toBe(
                "DesignLogo"
            )
        }
    )

    test("uses the dashboard as the desktop landing route", () => {
        const route = routeForUrl(url_with_hash("/"))

        expect(route._tag).toBe("Dashboard")
        expect(sidebarRouteTag(route)).toBe("Dashboard")
    })

    test("keeps the Projects index active", () => {
        const route = routeForUrl(url_with_hash("/projects"))

        expect(route._tag).toBe("Projects")
        expect(sidebarRouteTag(route)).toBe("Projects")
    })

    test("routes live stats through its sidebar item", () => {
        const route = routeForUrl(url_with_hash("/stats"))

        expect(route._tag).toBe("Stats")
        expect(sidebarRouteTag(route)).toBe("Stats")
    })

    test.each([
        ["/marketing", "/web/pages"],
        ["/marketing/layouts", "/content/templates?kind=web"],
        ["/marketing/layouts/urm", "/web/pages/new?kind=urm_marketing"],
        ["/marketing/layouts/blank", "/web/pages/new?kind=landing_blank"],
        ["/marketing/layouts/blank/page-1", "/content/web/page-1?mode=edit"],
    ])("replaces the legacy Marketing URL %s", (pathname, expected) => {
        expect(
            legacy_marketing_replacement_href(url_with_hash(pathname))
        ).toEqual(Option.some(expected))
    })

    test("preserves Marketing URL state while enforcing the canonical editor mode", () => {
        const url = Url.make({
            protocol: "http:",
            host: "urm.test",
            port: Option.some("1420"),
            pathname: "/marketing/layouts/blank/page-1/",
            search: Option.some("?subdomain=docs&mode=preview"),
            hash: Option.some("#hero"),
        })

        expect(legacy_marketing_replacement_href(url)).toEqual(
            Option.some("/content/web/page-1?subdomain=docs&mode=edit#hero")
        )
    })

    test("routes the Shop builder and nested catalog sections", () => {
        const shop = routeForUrl(url_with_hash("/shop"))
        const products = routeForUrl(url_with_hash("/shop/products"))
        const create_product = routeForUrl(url_with_hash("/shop/products/new"))
        const collections = routeForUrl(
            url_with_hash("/shop/collections/summer")
        )

        expect(shop).toEqual({ _tag: "Shop", shop_path: "/shop" })
        expect(sidebarRouteTag(shop)).toBe("Shop")
        expect(sidebarRouteTag(products)).toBe("ShopProducts")
        expect(sidebarRouteTag(create_product)).toBe("ShopProductCreate")
        expect(sidebarRouteTag(collections)).toBe("ShopCollections")
    })

    test("loads a project from its slug", () => {
        expect(routeForUrl(url_with_hash("/projects/client-portal"))).toEqual({
            _tag: "Project",
            project_slug: "client-portal",
        })
    })

    test("routes the issues index and detail through the sidebar", () => {
        const index_route = routeForUrl(url_with_hash("/issues"))
        const detail_route = routeForUrl(
            url_with_hash("/issues/j7700000000000000000000000000001")
        )

        expect(index_route._tag).toBe("Issues")
        expect(sidebarRouteTag(index_route)).toBe("Issues")
        expect(detail_route).toEqual({
            _tag: "Issue",
            issue_id: "j7700000000000000000000000000001",
        })
        expect(sidebarRouteTag(detail_route)).toBe("Issues")
    })

    test("routes tags through its sidebar item", () => {
        const route = routeForUrl(url_with_hash("/tags"))

        expect(route._tag).toBe("Tags")
        expect(sidebarRouteTag(route)).toBe("Tags")
    })

    test("routes domain publishing through its sidebar item", () => {
        const route = routeForUrl(url_with_hash("/domains"))

        expect(route._tag).toBe("Domains")
        expect(sidebarRouteTag(route)).toBe("Domains")
    })

    test("routes site composition through Design", () => {
        const route = routeForUrl(url_with_hash("/design"))
        const ideas = routeForUrl(url_with_hash(designIdeasHref()))
        const main_layout = routeForUrl(
            url_with_hash("/design/layouts/main-layout")
        )
        const favicons = routeForUrl(url_with_hash("/design/favicons"))

        expect(route._tag).toBe("Design")
        expect(sidebarRouteTag(route)).toBe("Design")
        expect(ideas).toEqual({
            _tag: "Design",
            design_path: "/design/ideas",
        })
        expect(sidebarRouteTag(ideas)).toBe("DesignIdeas")
        expect(main_layout).toEqual({
            _tag: "Design",
            design_path: "/design/layouts/main-layout",
        })
        expect(sidebarRouteTag(main_layout)).toBe("DesignMainLayout")
        expect(sidebarRouteTag(favicons)).toBe("DesignFavicons")
    })

    test("routes Forms and its child workspaces", () => {
        const forms = routeForUrl(url_with_hash("/forms"))
        const detail = routeForUrl(url_with_hash("/forms/contact"))
        const submissions = routeForUrl(
            url_with_hash("/forms/contact/submissions")
        )
        const settings = routeForUrl(url_with_hash("/forms/contact/settings"))

        expect(forms).toEqual({ _tag: "Forms", forms_path: "/forms" })
        expect(sidebarRouteTag(forms)).toBe("Forms")
        expect(sidebarRouteTag(detail)).toBe("FormsDetail")
        expect(sidebarRouteTag(submissions)).toBe("FormsSubmissions")
        expect(sidebarRouteTag(settings)).toBe("FormsSettings")
    })

    test("routes Sysadmin and its observability sections", () => {
        const sysadmin = routeForUrl(url_with_hash("/sysadmin"))
        const audit = routeForUrl(url_with_hash("/sysadmin/audit"))
        const logging = routeForUrl(url_with_hash("/sysadmin/logging"))
        const system = routeForUrl(url_with_hash("/sysadmin/system"))

        expect(sysadmin).toEqual({
            _tag: "Sysadmin",
            sysadmin_path: "/sysadmin",
        })
        expect(sidebarRouteTag(sysadmin)).toBe("Sysadmin")
        expect(sidebarRouteTag(audit)).toBe("SysadminAudit")
        expect(sidebarRouteTag(logging)).toBe("SysadminLogging")
        expect(sidebarRouteTag(system)).toBe("SysadminSystem")
    })

    test("routes appearance settings and their nested pages", () => {
        const settings = routeForUrl(url_with_hash("/settings"))
        const theme = routeForUrl(url_with_hash("/settings/theme"))
        const fonts = routeForUrl(url_with_hash("/settings/fonts"))

        expect(settings).toEqual({
            _tag: "Settings",
            settings_path: "/settings",
        })
        expect(sidebarRouteTag(settings)).toBe("Settings")
        expect(sidebarRouteTag(theme)).toBe("SettingsTheme")
        expect(sidebarRouteTag(fonts)).toBe("SettingsFonts")
    })

    test("routes media sections through the media sidebar group", () => {
        const library = routeForUrl(url_with_hash("/media/library"))
        const gallery = routeForUrl(url_with_hash("/media/gallery"))
        const video = routeForUrl(url_with_hash("/media/video/menwith-balls"))
        const streaming = routeForUrl(url_with_hash("/media/streaming"))

        expect(library).toEqual({
            _tag: "Media",
            media_path: "/media/library",
        })
        expect(sidebarRouteTag(library)).toBe("Media")
        expect(sidebarRouteTag(gallery)).toBe("MediaGallery")
        expect(sidebarRouteTag(video)).toBe("MediaVideo")
        expect(sidebarRouteTag(streaming)).toBe("MediaStreaming")
        expect(media_streaming_href()).toBe("/media/streaming")
    })

    test("routes event detail, edit, and menu paths through Events", () => {
        const detail = routeForUrl(
            url_with_hash("/events/jd700000000000000000000000000001")
        )
        const edit = routeForUrl(
            url_with_hash("/events/jd700000000000000000000000000001/edit")
        )
        const menu = routeForUrl(url_with_hash("/events/menu"))

        expect(detail).toEqual({
            _tag: "Events",
            events_path: "/events/jd700000000000000000000000000001",
        })
        expect(edit).toEqual({
            _tag: "Events",
            events_path: "/events/jd700000000000000000000000000001/edit",
        })
        expect(sidebarRouteTag(detail)).toBe("Events")
        expect(sidebarRouteTag(menu)).toBe("EventsMenu")
    })

    test("routes the available Mail sections through the Mail group", () => {
        const dashboard = routeForUrl(url_with_hash("/mail"))
        const contacts = routeForUrl(url_with_hash("/mail/contacts"))
        const send = routeForUrl(url_with_hash("/mail/send"))
        const sent = routeForUrl(url_with_hash("/mail/sent"))
        const stats = routeForUrl(url_with_hash("/mail/stats"))
        const members = routeForUrl(url_with_hash("/mail/members"))
        const manage_members = routeForUrl(
            url_with_hash("/mail/members/manage")
        )
        const newsletter = routeForUrl(url_with_hash("/mail/newsletter"))
        const subscriptions = routeForUrl(url_with_hash("/mail/subscriptions"))
        const templates = routeForUrl(url_with_hash("/mail/templates"))

        expect(dashboard).toEqual({ _tag: "Mail", mail_path: "/mail" })
        expect(sidebarRouteTag(dashboard)).toBe("Mail")
        expect(send).toEqual({
            _tag: "Mail",
            mail_path: "/mail/send",
        })
        expect(sidebarRouteTag(send)).toBe("MailSend")
        expect(sent).toEqual({
            _tag: "Mail",
            mail_path: "/mail/sent",
        })
        expect(sidebarRouteTag(sent)).toBe("MailSent")
        expect(stats).toEqual({
            _tag: "Mail",
            mail_path: "/mail/stats",
        })
        expect(sidebarRouteTag(stats)).toBe("MailStats")
        expect(contacts).toEqual({
            _tag: "Mail",
            mail_path: "/mail/contacts",
        })
        expect(sidebarRouteTag(contacts)).toBe("MailContacts")
        expect(sidebarRouteTag(members)).toBe("MailMembers")
        expect(sidebarRouteTag(manage_members)).toBe("MailMembersManage")
        expect(sidebarRouteTag(newsletter)).toBe("MailNewsletter")
        expect(sidebarRouteTag(subscriptions)).toBe("MailSubscriptions")
        expect(templates).toEqual({
            _tag: "Mail",
            mail_path: "/mail/templates",
        })
        expect(sidebarRouteTag(templates)).toBe("MailTemplates")
    })

    test("routes Data, Spreadsheets, and CSV through the Data group", () => {
        const data = routeForUrl(url_with_hash("/data"))
        const spreadsheets = routeForUrl(url_with_hash("/data/spreadsheets"))
        const csv = routeForUrl(url_with_hash("/data/csv"))

        expect(data).toEqual({ _tag: "Data", data_path: "/data" })
        expect(sidebarRouteTag(data)).toBe("Data")
        expect(sidebarRouteTag(spreadsheets)).toBe("DataSpreadsheets")
        expect(sidebarRouteTag(csv)).toBe("DataCsv")
    })

    test("routes internal Documents, public Pages, Bookmarks, and Blog separately", () => {
        const documents = routeForUrl(url_with_hash("/documents"))
        const pages = routeForUrl(url_with_hash("/pages"))
        const new_page = routeForUrl(url_with_hash("/pages/new"))
        const subdomain_pages = routeForUrl(
            url_with_hash("/pages/subdomains/docs")
        )
        const bookmarks = routeForUrl(url_with_hash("/pages/bookmarks"))
        const blog = routeForUrl(url_with_hash("/blog/drafts"))
        const subdomain_blog = routeForUrl(
            url_with_hash("/blog/subdomains/docs/drafts")
        )

        expect(documents).toEqual({
            _tag: "Documents",
            documents_path: "/documents",
        })
        expect(sidebarRouteTag(documents)).toBe("ContentDocuments")
        expect(Option.getOrUndefined(documentsFeaturePath(documents))).toBe(
            "/content/documents"
        )
        expect(
            Option.getOrUndefined(
                documentsFeaturePath(
                    routeForUrl(url_with_hash("/content/documents"))
                )
            )
        ).toBe("/content/documents")
        expect(pages).toEqual({ _tag: "Pages", pages_path: "/pages" })
        expect(sidebarRouteTag(pages)).toBe("Pages")
        expect(new_page).toEqual({
            _tag: "Pages",
            pages_path: "/pages/new",
        })
        expect(sidebarRouteTag(new_page)).toBe("PagesNew")
        expect(subdomain_pages).toEqual({
            _tag: "Pages",
            pages_path: "/pages/subdomains/docs",
        })
        expect(bookmarks).toEqual({
            _tag: "Pages",
            pages_path: "/pages/bookmarks",
        })
        expect(sidebarRouteTag(bookmarks)).toBe("ContentBookmarks")
        expect(blog).toEqual({
            _tag: "Blog",
            blog_path: "/blog/drafts",
        })
        expect(sidebarRouteTag(blog)).toBe("BlogDrafts")
        expect(subdomain_blog).toEqual({
            _tag: "Blog",
            blog_path: "/blog/subdomains/docs/drafts",
        })
        expect(sidebarRouteTag(subdomain_blog)).toBe("BlogDrafts")
        expect(
            sidebarRouteTag(routeForUrl(url_with_hash("/blog/published")))
        ).toBe("BlogPublished")
        expect(sidebarRouteTag(routeForUrl(url_with_hash("/blog/new")))).toBe(
            "BlogNew"
        )
        expect(documentsBlogHref()).toBe("/blog/published")
        expect(documentsBlogPublishedHref()).toBe("/blog/published")
        expect(documentsBlogDraftsHref()).toBe("/blog/drafts")
        expect(documentsBlogNewHref()).toBe("/blog/new")
    })

})

test("redirects the old Links URL to Bookmarks with search and hash intact", () => {
    const url = Url.make({
        protocol: "https:",
        host: "urm.test",
        port: Option.none(),
        pathname: "/content/links/",
        search: Option.some("?q=docs"),
        hash: Option.some("#saved"),
    })
    expect(legacy_content_replacement_href(url)).toEqual(
        Option.some("/content/bookmarks?q=docs#saved")
    )
})
