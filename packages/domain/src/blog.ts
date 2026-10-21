import { Schema } from "effect"

import {
    BlogPostTitle,
    BlogPostContent,
    BlogPostContentType,
    BlogPostExcerpt,
    BlogPostSlug,
    PublicationState,
    SeoTitle,
    SeoDescription,
    SubdomainSlug,
} from "./schemas/publications.ts"

import {
    ContentTemplateName,
    ContentTemplateDescription,
    ContentTemplateTags,
    ContentTemplateSource,
} from "./schemas/content-templates.ts"

export const BlogFields = Schema.Struct({
    title: BlogPostTitle,
    content: BlogPostContent,
    content_type: BlogPostContentType,
    excerpt: Schema.NullOr(BlogPostExcerpt),
    seo_title: Schema.NullOr(SeoTitle),
    seo_description: Schema.NullOr(SeoDescription),
})
export const BlogPost = Schema.Struct({
    id: Schema.String,
    title: Schema.String,
    content: Schema.String,
    content_type: BlogPostContentType,
    excerpt: Schema.NullOr(Schema.String),
    seo_title: Schema.NullOr(Schema.String),
    seo_description: Schema.NullOr(Schema.String),
    editorial_state: PublicationState,
    template_source: Schema.NullOr(ContentTemplateSource),
    created_at: Schema.Number,
    updated_at: Schema.Number,
})
export const BlogAssignment = Schema.Struct({
    id: Schema.String,
    blog_post_id: Schema.String,
    slug: Schema.String,
    publication_state: PublicationState,
    published_at: Schema.NullOr(Schema.Number),
    is_featured: Schema.Boolean,
    order_position: Schema.Number,
    created_at: Schema.Number,
    updated_at: Schema.Number,
})
export const BlogTemplateFields = Schema.Struct({
    ...BlogFields.fields,
    name: ContentTemplateName,
    description: ContentTemplateDescription,
    tags: ContentTemplateTags,
})
export const BlogTemplate = Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    description: Schema.String,
    tags: Schema.Array(Schema.String),
    title: Schema.String,
    content: Schema.String,
    content_type: BlogPostContentType,
    excerpt: Schema.NullOr(Schema.String),
    seo_title: Schema.NullOr(Schema.String),
    seo_description: Schema.NullOr(Schema.String),
    revision: Schema.Number,
    created_at: Schema.Number,
    updated_at: Schema.Number,
})
export const BlogLibraryRecord = Schema.Struct({
    id: Schema.String,
    posts: Schema.Array(BlogPost),
    assignments: Schema.Array(BlogAssignment),
    templates: Schema.Array(BlogTemplate),
})
export const BlogScope = {
    domain_id: Schema.String,
    subdomain_slug: Schema.NullOr(SubdomainSlug),
}
export const BlogAction = Schema.Union([
    Schema.Struct({
        _tag: Schema.Literal("save"),
        id: Schema.String,
        is_new: Schema.Boolean,
        ...BlogFields.fields,
        slug: BlogPostSlug,
        published: Schema.Boolean,
    }),
    Schema.Struct({
        _tag: Schema.Literal("from_template"),
        id: Schema.String,
        template_id: Schema.String,
    }),
    Schema.Struct({ _tag: Schema.Literal("delete"), id: Schema.String }),
    Schema.Struct({
        _tag: Schema.Literal("remove_assignment"),
        id: Schema.String,
    }),
    Schema.Struct({
        _tag: Schema.Literal("save_template"),
        id: Schema.String,
        expected_revision: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
        ...BlogTemplateFields.fields,
    }),
    Schema.Struct({
        _tag: Schema.Literal("delete_template"),
        id: Schema.String,
    }),
])
export type BlogAction = typeof BlogAction.Type
export const blog_library_id = (
    domain_id: string,
    subdomain_slug: string | null
) => `${domain_id}:${subdomain_slug ?? ""}`

export type BlogFields = typeof BlogFields.Type

export type BlogPost = typeof BlogPost.Type

export type BlogAssignment = typeof BlogAssignment.Type

export type BlogTemplateFields = typeof BlogTemplateFields.Type

export type BlogTemplate = typeof BlogTemplate.Type

export type BlogLibraryRecord = typeof BlogLibraryRecord.Type

export class BlogWriteError extends Schema.TaggedError<BlogWriteError>()(
    "BlogWriteError",
    { message: Schema.String }
) {}
