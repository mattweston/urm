import type { SearchRequest } from "./transport.ts"
import { grep_url_href } from "./route.ts"

export const documentation_origin = (path: string) =>
    path.startsWith(".context/foldkit-plus/")
        ? "Foldkit Plus · vendored"
        : path.startsWith(".context/foldkit/")
          ? "Foldkit · vendored"
          : path.startsWith(".context/effect/")
            ? "Effect v4 · vendored"
            : "URM"

export const documentation_link = (
    url: string,
    path: string,
    state?: SearchRequest
): string | undefined => {
    try {
        if (/^[a-z][a-z\d+.-]*:/i.test(url) || url.startsWith("//")) {
            const target = new URL(url, "https://docs.urm.dev")
            return ["https:", "http:", "mailto:"].includes(target.protocol)
                ? target.href
                : undefined
        }
        const root = path.startsWith(
            ".context/foldkit/packages/website/src/page/"
        )
            ? ".context/foldkit/packages/website/src/page/"
            : path.startsWith(".context/foldkit-plus/docs/")
              ? ".context/foldkit-plus/docs/"
              : path.startsWith(".context/effect/")
                ? ".context/effect/"
                : path.startsWith("apps/docs/content/")
                  ? "apps/docs/content/"
                  : "docs/"
        const target = new URL(
            url.startsWith("/") ? "/" + root + url.slice(1) : url,
            `https://source.invalid/${path}`
        )
        if (target.origin !== "https://source.invalid") return undefined
        const doc_path = decodeURIComponent(target.pathname.slice(1))
        if (!doc_path.startsWith(root)) return undefined
        const request = state ?? {
            query: "Schema.Struct",
            selected: "",
            file_offset: 0,
            match_offsets: {},
            doc_offset: 0,
            snapshot: "",
        }
        return grep_url_href(request.query, {
            ...request,
            doc_path,
            doc_heading: decodeURIComponent(target.hash.slice(1)),
            doc_offset: 0,
        })
    } catch {
        return undefined
    }
}
