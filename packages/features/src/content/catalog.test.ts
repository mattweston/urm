import { describe, expect, test } from "vitest"
import { email_gallery_catalog } from "../mail/templates/gallery-catalog.ts"
import { allTemplates as email_gallery_views } from "../mail/templates/template-views.ts"

import {
    authoring_templates,
    content_templates,
    template_replacement,
    type ContentTemplate,
    type OrganizationTemplateSummary,
} from "./catalog.ts"
import {
    catalog_filter_href,
    catalog_filters_for_search,
    empty_catalog_filters,
    filter_content_templates,
    filter_organization_templates,
} from "./filter.ts"
import {
    ContentDocumentsRoute,
    ContentItemRoute,
    ContentBookmarksRoute,
    ContentNewRoute,
    ContentNotFoundRoute,
    ContentRoute,
    ContentTemplatesRoute,
    content_blog_new_href,
    content_email_draft_href,
    content_email_draft_id_for_path,
    content_email_new_href,
    content_form_new_href,
    content_item_href,
    content_item_id_for_path,
    content_item_route_for_path,
    content_social_new_href,
    is_content_creation_path,
    is_content_edit_requested,
    route_for_path,
} from "./route.ts"

describe("content template catalog", () => {
    const starter: ContentTemplate = {
        template_id: "test.old",
        template_version: 1,
        content_kind: "email",
        name: "Old",
        description: "Old starter",
        category: "Marketing",
        tags: [],
        provenance: "builtin",
        capability: "authoring",
        creation_href: "/old",
        preview_href: null,
        deprecation: {
            reason: "Use the updated starter.",
            replacement_template_id: "test.new",
        },
    }
    const replacement: ContentTemplate = {
        ...starter,
        template_id: "test.new",
        name: "New",
        creation_href: "/new",
    }
    const active_replacement: ContentTemplate = {
        template_id: replacement.template_id,
        template_version: 2,
        content_kind: "email",
        name: "New",
        description: "New starter",
        category: "Marketing",
        tags: [],
        provenance: "builtin",
        capability: "authoring",
        creation_href: "/new",
        preview_href: null,
    }

    test("offers a compatible replacement without rewriting the original starter", () => {
        expect(
            template_replacement(starter, [starter, active_replacement])
        ).toBe(active_replacement)
        expect(starter.creation_href).toBe("/old")
        expect(starter.template_version).toBe(1)
        expect(
            template_replacement(active_replacement, [starter])
        ).toBeUndefined()
    })

    test("does not offer missing, deprecated, incompatible or self replacements", () => {
        const invalid: ReadonlyArray<ContentTemplate> = [
            replacement,
            { ...active_replacement, content_kind: "web" },
            { ...active_replacement, capability: "transactional" },
            { ...active_replacement, provenance: "organization" },
            { ...active_replacement, creation_href: null },
        ]
        for (const candidate of invalid) {
            expect(template_replacement(starter, [candidate])).toBeUndefined()
        }
        expect(template_replacement(starter, [])).toBeUndefined()
        expect(
            template_replacement(
                {
                    ...starter,
                    deprecation: {
                        reason: "Retired",
                        replacement_template_id: null,
                    },
                },
                [active_replacement]
            )
        ).toBeUndefined()
        expect(
            template_replacement(
                {
                    ...starter,
                    deprecation: {
                        reason: "Retired",
                        replacement_template_id: starter.template_id,
                    },
                },
                [starter]
            )
        ).toBeUndefined()
        expect(
            template_replacement({ ...starter, provenance: "system" }, [
                active_replacement,
            ])
        ).toBeUndefined()
    })

    test("uses stable, unique template ids", () => {
        const ids = content_templates.map((template) => template.template_id)

        expect(new Set(ids).size).toBe(ids.length)
        expect(ids).toContain("web.marketing_starter")
        expect(ids).toContain("email.auth_password_reset")
        expect(ids).toContain("email.newsletter_blank")
        expect(ids).toContain("form.blank")
        expect(ids).toContain("social.blank")
        expect(ids).toContain("document.blank")
    })

    test("does not offer controlled email renderers as authoring starters", () => {
        expect(
            authoring_templates.every(
                (template) => template.capability === "authoring"
            )
        ).toBe(true)
        expect(
            authoring_templates.some(
                (template) =>
                    template.template_id === "email.auth_password_reset"
            )
        ).toBe(false)
        expect(
            authoring_templates.some(
                (template) => template.template_id === "email.newsletter_blank"
            )
        ).toBe(true)
    })

    test("includes every hardcoded Mail gallery entry with truthful capabilities", () => {
        const gallery_view_ids = email_gallery_views
            .filter((template) => !template.id.startsWith("production-"))
            .map((template) => template.id)
        const catalog_ids = email_gallery_catalog.map((template) => template.id)
        const email_templates = content_templates.filter(
            (template) => template.content_kind === "email"
        )
        const preview_templates = email_templates.filter(
            (template) => template.capability === "preview_only"
        )
        const previewable_template_ids = email_templates.flatMap((template) => {
            if (template.preview_href === null) return []
            if (template.capability === "transactional") {
                return [
                    `production-${template.template_id.slice("email.".length)}`,
                ]
            }
            const preview_id = new URL(
                template.preview_href,
                "https://urm.test"
            ).searchParams.get("preview")
            return preview_id === null ? [] : [preview_id]
        })

        expect(catalog_ids).toEqual(gallery_view_ids)
        expect(
            email_templates
                .filter((template) => template.capability === "transactional")
                .map((template) => ({
                    href: template.preview_href,
                    create: template.creation_href,
                }))
        ).toEqual([
            {
                href: "/mail/transactional/auth_email_verification",
                create: null,
            },
            { href: "/mail/transactional/auth_password_reset", create: null },
            { href: "/mail/transactional/auth_password_changed", create: null },
        ])
        expect(preview_templates).toHaveLength(25)
        expect(email_templates).toHaveLength(40)
        expect(Array.from(previewable_template_ids).sort()).toEqual(
            email_gallery_views.map((template) => template.id).sort()
        )
        expect(
            email_templates.filter(
                (template) =>
                    template.capability === "authoring" &&
                    template.preview_href !== null
            )
        ).toHaveLength(10)
        expect(
            preview_templates.every(
                (template) =>
                    template.creation_href === null &&
                    template.preview_href !== null
            )
        ).toBe(true)
    })

    test("uses canonical Content creation routes for typed blank templates", () => {
        expect(
            content_templates.find(
                (template) => template.template_id === "blog.blank"
            )?.creation_href
        ).toBe(content_blog_new_href())
        expect(
            content_templates.find(
                (template) => template.template_id === "social.blank"
            )?.creation_href
        ).toBe(content_social_new_href())
        expect(
            content_templates.find(
                (template) => template.template_id === "form.blank"
            )?.creation_href
        ).toBe(content_form_new_href())
    })

    test("filters templates by kind, category, provenance, and capability", () => {
        const filters = catalog_filters_for_search(
            "?kind=email&category=Auth&provenance=system&capability=transactional"
        )
        const filtered = filter_content_templates(content_templates, filters)

        expect(filtered).toHaveLength(3)
        expect(
            filtered.every(
                (template) =>
                    template.content_kind === "email" &&
                    template.category === "Auth" &&
                    template.provenance === "system" &&
                    template.capability === "transactional"
            )
        ).toBe(true)
    })

    test("ignores invalid filter parameters and creates stable filter links", () => {
        const filters = catalog_filters_for_search(
            "?kind=video&category=Unknown&provenance=external"
        )

        expect(filters).toEqual(empty_catalog_filters())
        expect(
            catalog_filter_href("/content/templates", {
                ...filters,
                content_kind: "web",
                provenance: "builtin",
            })
        ).toBe("/content/templates?kind=web&provenance=builtin")
    })

    test("searches built-in templates and filters by tag", () => {
        const filtered = filter_content_templates(
            content_templates,
            catalog_filters_for_search("?q=rich+text&tag=page")
        )

        expect(filtered.map((template) => template.template_id)).toEqual([
            "web.page_blank",
        ])
    })

    test("filters organization templates by their catalog metadata", () => {
        const templates: ReadonlyArray<OrganizationTemplateSummary<string>> = [
            {
                template_id: "template-1",
                name: "Product launch",
                description: "Reusable campaign page",
                category: "Marketing",
                tags: ["launch", "product"],
                content_kind: "web",
                provenance: "organization",
                capability: "authoring",
                block_count: 4,
                revision: 1,
            },
        ]

        expect(
            filter_organization_templates(
                templates,
                catalog_filters_for_search(
                    "?q=campaign&tag=launch&provenance=organization"
                )
            )
        ).toHaveLength(1)
        expect(
            filter_organization_templates(
                templates,
                catalog_filters_for_search("?kind=email")
            )
        ).toHaveLength(0)
    })
})

describe("content routes", () => {
    test.each([
        ["/content", ContentRoute],
        ["/content/", ContentRoute],
        ["/content/new", ContentNewRoute],
        ["/content/documents", ContentDocumentsRoute],
        ["/content/bookmarks", ContentBookmarksRoute],
        ["/content/templates", ContentTemplatesRoute],
        ["/content/web/page-1", ContentItemRoute],
        ["/content/unknown", ContentNotFoundRoute],
    ])("matches %s", (pathname, route) => {
        expect(route_for_path(pathname)).toBe(route)
    })

    test("builds and decodes canonical item routes", () => {
        const href = content_item_href("web", "page/with spaces")

        expect(href).toBe("/content/web/page%2Fwith%20spaces")
        expect(content_item_route_for_path(href)).toEqual({
            content_kind: "web",
            content_id: "page/with spaces",
        })
        expect(content_item_route_for_path("/content/video/page-1")).toBeNull()
        expect(content_item_route_for_path("/content/web/%E0%A4%A")).toBeNull()
        expect(content_item_id_for_path(href, "web")).toBe("page/with spaces")
        expect(content_item_id_for_path(href, "blog")).toBeNull()
        expect(is_content_creation_path("/content/social/new", "social")).toBe(
            true
        )
        expect(
            is_content_creation_path("/content/social/post-1", "social")
        ).toBe(false)
        expect(is_content_edit_requested("?mode=edit")).toBe(true)
        expect(is_content_edit_requested("?mode=preview")).toBe(false)
        expect(content_email_new_href()).toBe("/content/email/new")
        expect(content_blog_new_href()).toBe("/content/blog/new")
        expect(content_social_new_href()).toBe("/content/social/new")
        expect(content_form_new_href()).toBe("/content/form/new")
        expect(content_email_draft_href("draft/one", true)).toBe(
            "/content/email/draft%2Fone?mode=edit"
        )
        expect(
            content_email_draft_id_for_path("/content/email/draft%2Fone")
        ).toBe("draft/one")
        expect(content_email_draft_id_for_path("/content/email/new")).toBeNull()
    })
})
