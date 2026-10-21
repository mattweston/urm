// Post metadata with no markdown imports, so the Astro page and the prerender
// script can enumerate the slugs. content.ts attaches the compiled document to
// each of these; scripts/prerender.ts runs under tsx and has no Vite pipeline,
// so it could not import a .md file even indirectly.
export type PostMeta = Readonly<{
    slug: string
    title: string
    publishedOn: string
    summary: string
}>

export const postMeta: ReadonlyArray<PostMeta> = [
    {
        slug: "markdown-in-the-model",
        title: "Markdown in the Model",
        publishedOn: "12 July 2026",
        summary:
            "Markdown compiled into typed Foldkit views, with a live counter nestled between paragraphs.",
    },
    {
        slug: "writing-with-directives",
        title: "Writing with directives",
        publishedOn: "28 June 2026",
        summary:
            "The vocabulary the plugin accepts, and why an unknown directive is a build failure rather than an empty element.",
    },
]

export const postSlugs: ReadonlyArray<string> = postMeta.map(
    (post) => post.slug
)
