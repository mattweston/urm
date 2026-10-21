// Stylesheet side-effect imports (e.g. mapbox-gl) are resolved by the
// consuming app's bundler; declare them so tsc accepts the import.
declare module "*.css"

/* The personal-blog lab imports its markdown posts directly. The
   `personal-blog-markdown` plugin in urm.dev's vite-markdown.ts serves them
   as virtual modules; these declarations let tsc accept the imports. */
declare module "*.md" {
    const document: unknown
    export default document
}

declare module "*.md?highlight" {
    const highlighted_code: Record<string, string>
    export default highlighted_code
}
