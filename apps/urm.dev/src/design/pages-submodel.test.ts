import { Option, Schema as S } from "effect"
import { Url } from "foldkit/url"
import { describe, expect, test } from "vitest"

import { DomainId, SubdomainId } from "./records.ts"
import { InsertedRichTextEditorText } from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.schema.ts"

import * as Design from "./pages-legacy.ts"

const domain_id = S.decodeUnknownSync(DomainId)(
    "j1700000000000000000000000000001"
)
const subdomain_id = S.decodeUnknownSync(SubdomainId)(
    "j2700000000000000000000000000001"
)
const homepage_id = S.decodeUnknownSync(Design.Page.fields.id)(
    "j4700000000000000000000000000001"
)

const url = (path: string, search = "") =>
    Url.make({
        protocol: "http:",
        host: "urm.test",
        port: Option.some("1420"),
        pathname: path,
        search: search === "" ? Option.none() : Option.some(search),
        hash: Option.none(),
    })

const subdomains = [
    {
        id: globalThis.String(subdomain_id),
        domain_id: globalThis.String(domain_id),
        name: "Docs",
        slug: "docs",
    },
]

const homepage: Design.Page = {
    id: homepage_id,
    title: "Welcome",
    content: JSON.stringify({
        schema_version: 1,
        document: {
            type: "doc",
            children: [
                {
                    type: "paragraph",
                    children: [{ type: "text", text: "" }],
                },
            ],
        },
    }),
    content_type: "rich_text_json",
    slug: null,
    navigation_label: "Welcome",
    show_in_navigation: true,
    order_position: 0,
    is_homepage: true,
    publication_state: "draft",
    seo_title: "Welcome SEO",
    seo_description: "Welcome description",
    noindex: true,
    updated_at: 1,
}

const landing_homepage: Design.Page = {
    ...homepage,
    content: JSON.stringify({ schema_version: 1, blocks: [] }),
    content_type: "landing_json",
    show_in_navigation: false,
}

describe("design pages submodel", () => {
    test("separates the page list from the new page route", () => {
        const new_page = Design.init(url("/pages/new"))
        const index = Design.changed_url(new_page, url("/pages"))

        expect(new_page.route).toBe("new")
        expect(index.route).toBe("index")
    })

    test("uses Web as the canonical page workspace without changing ownership", () => {
        const model = Design.init(url("/web/pages/subdomains/docs/new"))
        const owner = Design.owner_args(
            model,
            Option.some(domain_id),
            subdomains
        )

        expect(model.route_base).toBe("/web/pages")
        expect(model.route).toBe("new")
        expect(Option.getOrUndefined(owner)).toEqual({
            domain_id,
            subdomain_id,
        })
    })

    test("opens a canonical Content page route in the existing inline editor", () => {
        const canonical_url = url(
            `/content/web/${globalThis.String(homepage_id)}`,
            "?mode=edit"
        )
        const initial = Design.init(canonical_url)
        const [loaded] = Design.update(
            initial,
            Design.LoadedPages({ pages: [homepage] }),
            Option.some(domain_id),
            subdomains
        )

        expect(initial.route_base).toBe("/web/pages")
        expect(initial.route).toBe("item")
        expect(initial.requested_page_id).toEqual(Option.some(homepage_id))
        expect(initial.requested_edit_mode).toBe(true)
        expect(Option.map(loaded.edit_draft, (draft) => draft.page_id)).toEqual(
            Option.some(homepage_id)
        )
    })

    test("reuses an already loaded owner page list when opening canonical edit", () => {
        const [loaded_index] = Design.update(
            Design.init(url("/web/pages")),
            Design.LoadedPages({ pages: [homepage] }),
            Option.some(domain_id),
            subdomains
        )
        const [editing] = Design.update(
            loaded_index,
            Design.ChangedUrl({
                url: url(
                    `/content/web/${globalThis.String(homepage_id)}`,
                    "?mode=edit&domain=test1"
                ),
            }),
            Option.some(domain_id),
            subdomains
        )

        expect(editing.is_loading).toBe(false)
        expect(editing.pages).toEqual([homepage])
        expect(
            Option.map(editing.edit_draft, (draft) => draft.page_id)
        ).toEqual(Option.some(homepage_id))
    })

    test("retains subdomain ownership context on a canonical Content route", () => {
        const model = Design.init(
            url(
                `/content/web/${globalThis.String(homepage_id)}`,
                "?subdomain=docs"
            )
        )
        const owner = Design.owner_args(
            model,
            Option.some(domain_id),
            subdomains
        )

        expect(Option.getOrUndefined(owner)).toEqual({
            domain_id,
            subdomain_id,
        })
    })

    test("preselects a blank landing page from Marketing", () => {
        const model = Design.init(url("/pages/new", "?kind=landing_blank"))

        expect(model.new_page_kind).toBe("landing_blank")
    })

    test("uses the main domain owner for the base Design route", () => {
        const owner = Design.owner_args(
            Design.init(url("/pages")),
            Option.some(domain_id),
            subdomains
        )

        expect(Option.getOrUndefined(owner)).toEqual({
            domain_id,
            subdomain_id: null,
        })
    })

    test("saves generated route inclusion for the selected publication", () => {
        const [model, commands] = Design.update(
            Design.init(url("/web/pages")),
            Design.RequestedSetPublicationModule({
                module_id: "blog",
                included: false,
            }),
            Option.some(domain_id),
            subdomains
        )

        expect(model.is_busy).toBe(true)
        expect(commands).toHaveLength(1)
        expect(commands[0]?.name).toBe("SavePublicationModule")
        expect(commands[0]?.args).toEqual({
            domain_id,
            subdomain_id: null,
            module_id: "blog",
            included: false,
        })
    })

    test("resolves an explicit subdomain route", () => {
        const owner = Design.owner_args(
            Design.init(url("/pages/subdomains/docs")),
            Option.some(domain_id),
            subdomains
        )

        expect(Option.getOrUndefined(owner)).toEqual({
            domain_id,
            subdomain_id,
        })
    })

    test("does not resolve a subdomain owned by another domain", () => {
        const other_domain_id = S.decodeUnknownSync(DomainId)(
            "j3700000000000000000000000000001"
        )
        const owner = Design.owner_args(
            Design.init(url("/pages/subdomains/docs")),
            Option.some(other_domain_id),
            subdomains
        )

        expect(Option.isNone(owner)).toBe(true)
    })

    test("does not make a document page the homepage automatically", () => {
        const [loaded] = Design.update(
            Design.init(url("/pages")),
            Design.LoadedPages({ pages: [] }),
            Option.some(domain_id),
            subdomains
        )
        const [draft] = Design.update(
            loaded,
            Design.ChangedNewPageTitle({ value: "Welcome" }),
            Option.some(domain_id),
            subdomains
        )
        const [, commands] = Design.update(
            draft,
            Design.SubmittedNewPage(),
            Option.some(domain_id),
            subdomains
        )

        expect(commands).toHaveLength(1)
        expect(commands[0]?.name).toBe("CreatePublicationPage")
        expect(commands[0]?.args).toEqual({
            domain_id,
            subdomain_id: null,
            title: "Welcome",
            content: JSON.stringify({
                schema_version: 1,
                document: {
                    type: "doc",
                    children: [
                        {
                            type: "paragraph",
                            children: [{ type: "text", text: "" }],
                        },
                    ],
                },
            }),
            content_type: "rich_text_json",
            slug: "welcome",
            navigation_label: "Welcome",
            show_in_navigation: true,
            is_homepage: false,
            publication_state: "draft",
            seo_title: null,
            seo_description: null,
            noindex: true,
            template_source: {
                template_id: "web.page_blank",
                template_version: 1,
                provenance: "builtin",
            },
        })
    })

    test("creates a landing draft without implicitly selecting the homepage", () => {
        const [loaded] = Design.update(
            Design.init(url("/pages/new")),
            Design.LoadedPages({ pages: [] }),
            Option.some(domain_id),
            subdomains
        )
        const [draft] = Design.update(
            loaded,
            Design.ChangedNewPageKind({ value: "landing_blank" }),
            Option.some(domain_id),
            subdomains
        )
        const [, commands] = Design.update(
            draft,
            Design.SubmittedNewPage(),
            Option.some(domain_id),
            subdomains
        )

        expect(commands[0]?.args).toMatchObject({
            title: "Landing page",
            content_type: "landing_json",
            slug: null,
            show_in_navigation: false,
            is_homepage: false,
            template_source: {
                template_id: "web.landing_blank",
                template_version: 1,
                provenance: "builtin",
            },
        })
    })

    test("does not create another landing page for the same publication", () => {
        const [loaded] = Design.update(
            Design.init(url("/pages/new")),
            Design.LoadedPages({ pages: [landing_homepage] }),
            Option.some(domain_id),
            subdomains
        )
        const [draft] = Design.update(
            loaded,
            Design.ChangedNewPageKind({ value: "landing_blank" }),
            Option.some(domain_id),
            subdomains
        )
        const [blocked, commands] = Design.update(
            draft,
            Design.SubmittedNewPage(),
            Option.some(domain_id),
            subdomains
        )
        expect(commands).toEqual([])
        expect(Option.getOrNull(blocked.error)).toContain(
            "already has a landing page"
        )
    })

    test("detects invalid duplicate homepage assignments", () => {
        expect(
            Design.has_homepage_conflict([
                homepage,
                {
                    ...landing_homepage,
                    id: S.decodeUnknownSync(Design.Page.fields.id)(
                        "j5700000000000000000000000000001"
                    ),
                },
            ])
        ).toBe(true)
        expect(Design.has_homepage_conflict([homepage])).toBe(false)
    })

    test("creates a non-homepage draft while the page list loads", () => {
        const [draft] = Design.update(
            Design.init(url("/pages/new")),
            Design.ChangedNewPageTitle({ value: "Welcome" }),
            Option.some(domain_id),
            subdomains
        )
        const [, commands] = Design.update(
            draft,
            Design.SubmittedNewPage(),
            Option.some(domain_id),
            subdomains
        )

        expect(commands).toHaveLength(1)
        expect(commands[0]?.args).toMatchObject({
            is_homepage: false,
            slug: "welcome",
        })
    })

    test("saves landing editor content through the page mutation", () => {
        const [loaded] = Design.update(
            Design.init(url("/pages")),
            Design.LoadedPages({ pages: [landing_homepage] }),
            Option.some(domain_id),
            subdomains
        )
        const content = JSON.stringify({
            schema_version: 1,
            blocks: [
                {
                    _tag: "Intro",
                    id: "intro",
                    heading: "Introduction",
                    body: "Body",
                },
            ],
        })
        const [saving, commands] = Design.update(
            loaded,
            Design.RequestedSaveLandingContent({
                page_id: homepage_id,
                content,
            }),
            Option.some(domain_id),
            subdomains
        )

        expect(saving.is_busy).toBe(true)
        expect(commands).toHaveLength(1)
        expect(commands[0]?.name).toBe("UpdatePublicationPage")
        expect(commands[0]?.args).toMatchObject({
            page_id: homepage_id,
            content,
            content_type: "landing_json",
            slug: null,
            show_in_navigation: false,
        })
    })

    test("stops loading when the page query fails", () => {
        const [model] = Design.update(
            Design.init(url("/pages/new")),
            Design.FailedPageAction({ error: "Could not load pages" }),
            Option.some(domain_id),
            subdomains
        )

        expect(model.is_loading).toBe(false)
        expect(Option.getOrUndefined(model.error)).toBe("Could not load pages")
    })

    test("reports a duplicate generated slug before creating", () => {
        const existing_page = {
            ...homepage,
            title: "Page 1",
            slug: "page-1",
            is_homepage: false,
        }
        const [loaded] = Design.update(
            Design.init(url("/pages/new")),
            Design.LoadedPages({ pages: [homepage, existing_page] }),
            Option.some(domain_id),
            subdomains
        )
        const [draft] = Design.update(
            loaded,
            Design.ChangedNewPageTitle({ value: "Page 1" }),
            Option.some(domain_id),
            subdomains
        )
        const [model, commands] = Design.update(
            draft,
            Design.SubmittedNewPage(),
            Option.some(domain_id),
            subdomains
        )

        expect(commands).toHaveLength(0)
        expect(Option.getOrUndefined(model.error)).toMatch(/\/page-1\//)
    })

    test("creates later pages with a slug instead of the homepage role", () => {
        const [loaded] = Design.update(
            Design.init(url("/pages/new")),
            Design.LoadedPages({ pages: [homepage] }),
            Option.some(domain_id),
            subdomains
        )
        const [draft] = Design.update(
            loaded,
            Design.ChangedNewPageTitle({ value: "About us" }),
            Option.some(domain_id),
            subdomains
        )
        const [, commands] = Design.update(
            draft,
            Design.SubmittedNewPage(),
            Option.some(domain_id),
            subdomains
        )

        expect(commands[0]?.args).toMatchObject({
            slug: "about-us",
            is_homepage: false,
        })
    })

    test("edits page content with the rich text editor", () => {
        const model = { ...Design.init(url("/pages")), pages: [homepage] }
        const [editing] = Design.update(
            model,
            Design.StartedEditingPage({ page_id: homepage_id }),
            Option.some(domain_id),
            subdomains
        )
        const [with_content] = Design.update(
            editing,
            Design.GotPageRichTextEditorMessage({
                message: InsertedRichTextEditorText({ value: "Hello" }),
            }),
            Option.some(domain_id),
            subdomains
        )
        const [, commands] = Design.update(
            with_content,
            Design.SubmittedPageEdit(),
            Option.some(domain_id),
            subdomains
        )

        expect(commands).toHaveLength(1)
        expect(commands[0]?.name).toBe("UpdatePublicationPage")
        expect(commands[0]?.args).toMatchObject({
            page_id: homepage_id,
            content_type: "rich_text_json",
            content: JSON.stringify({
                schema_version: 1,
                document: {
                    type: "doc",
                    children: [
                        {
                            type: "paragraph",
                            children: [{ type: "text", text: "Hello" }],
                        },
                    ],
                },
            }),
            seo_title: "Welcome SEO",
            seo_description: "Welcome description",
        })
    })
})
