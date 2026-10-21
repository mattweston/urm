import { Schema } from "effect"
import { ContentTemplateSource } from "./schemas/content-templates.ts"
import {
    PageTitle,
    PageContent,
    PageContentType,
    PageSlug,
    NavigationLabel,
    PublicationState,
    SeoTitle,
    SeoDescription,
    SubdomainSlug,
} from "./schemas/publications.ts"

export const PageFields = Schema.Struct({
    title: PageTitle,
    content: PageContent,
    content_type: PageContentType,
    slug: Schema.NullOr(PageSlug),
    navigation_label: NavigationLabel,
    show_in_navigation: Schema.Boolean,
    is_homepage: Schema.Boolean,
    publication_state: PublicationState,
    seo_title: Schema.NullOr(SeoTitle),
    seo_description: Schema.NullOr(SeoDescription),
    noindex: Schema.Boolean,
})
export type PageFields = typeof PageFields.Type
export const PageRecord = Schema.Struct({
    ...PageFields.fields,
    id: Schema.String,
    title: Schema.String,
    content: Schema.String,
    slug: Schema.NullOr(Schema.String),
    navigation_label: Schema.String,
    seo_title: Schema.NullOr(Schema.String),
    seo_description: Schema.NullOr(Schema.String),
    order_position: Schema.Number,
    template_source: Schema.NullOr(ContentTemplateSource),
    created_at: Schema.Number,
    updated_at: Schema.Number,
})
export type PageRecord = typeof PageRecord.Type
export const PagesLibraryRecord = Schema.Struct({
    id: Schema.String,
    pages: Schema.Array(PageRecord),
})
export type PagesLibraryRecord = typeof PagesLibraryRecord.Type
export const PagesScope = {
    domain_id: Schema.String,
    subdomain_slug: Schema.NullOr(SubdomainSlug),
}
export const PageAction = Schema.Union([
    Schema.Struct({
        _tag: Schema.Literal("select_homepage"),
        id: Schema.String,
    }),
    Schema.Struct({
        _tag: Schema.Literal("set_publication_state"),
        id: Schema.String,
        publication_state: PublicationState,
    }),
    Schema.Struct({
        _tag: Schema.Literal("create"),
        id: Schema.String,
        ...PageFields.fields,
        template_source: Schema.NullOr(ContentTemplateSource),
    }),
    Schema.Struct({
        _tag: Schema.Literal("update"),
        id: Schema.String,
        ...PageFields.fields,
    }),
    Schema.Struct({ _tag: Schema.Literal("remove"), id: Schema.String }),
    Schema.Struct({
        _tag: Schema.Literal("reorder"),
        positions: Schema.Array(
            Schema.Struct({ id: Schema.String, order_position: Schema.Int })
        ).check(Schema.isMaxLength(100)),
    }),
])
export type PageAction = typeof PageAction.Type
export const pages_library_id = (
    domain_id: string,
    subdomain_slug: string | null
) => `${domain_id}:${subdomain_slug ?? ""}`
export class PagesWriteError extends Schema.TaggedError<PagesWriteError>()(
    "PagesWriteError",
    { message: Schema.String }
) {}
