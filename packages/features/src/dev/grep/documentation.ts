import type { DocumentationSection } from "./data.ts"

export const documentation_source = (path: string) =>
    path.startsWith(".context/foldkit-plus/")
        ? "foldkit-plus"
        : path.startsWith(".context/foldkit/")
          ? "foldkit"
          : path.startsWith(".context/effect/")
            ? "effect"
            : "urm"

const slug = (text: string) =>
    text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}_\s-]/gu, "")
        .trim()
        .replace(/\s+/g, "-")
const page_key = (path: string) =>
    (path.startsWith(".context/foldkit/packages/website/src/page/")
        ? path
              .replace(/Page(?=\.md$)/, "")
              .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
              .toLowerCase()
        : path
    )
        .replace(/\.mdx?$/, "")
        .replace(/\/index$/, "")
        .replace(/\/$/, "")

export const linked_documentation = (
    sections: ReadonlyArray<DocumentationSection>,
    path: string,
    heading: string
): ReadonlyArray<DocumentationSection> => {
    const canonical =
        path === "apps/docs/content/domain/schemas/documents.md" ||
        path === "apps/docs/content/domain/schemas/documents.notes.md"
            ? "docs/domain/schemas/documents.md"
            : path
    const page = sections.filter(
        (section) => page_key(section.path) === page_key(canonical)
    )
    if (heading === "") return page
    return page.flatMap((section) => {
        if (slug(section.title) === slug(heading)) return [section]
        const lines = section.text.split("\n")
        let fence = ""
        let start = -1
        let level = 0
        let title = heading
        const containers: number[] = []
        let end = lines.length
        for (let index = 0; index < lines.length; index++) {
            const line = lines[index] ?? ""
            const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1]
            if (marker !== undefined) {
                if (fence === "") fence = marker
                else if (
                    marker[0] === fence[0] &&
                    marker.length >= fence.length
                )
                    fence = ""
                continue
            }
            if (fence !== "") continue
            const container = /^\s*(:{3,})(\w+)?/.exec(line)
            if (container?.[1] !== undefined) {
                if (container[2]) containers.push(container[1].length)
                else if (containers.at(-1) === container[1].length)
                    containers.pop()
            }
            const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line)
            if (match?.[1] === undefined || match[2] === undefined) continue
            if (start >= 0 && match[1].length <= level) {
                end = index
                break
            }
            if (
                start < 0 &&
                (slug(match[2]) === slug(heading) ||
                    /\{#([^}]+)\}\s*$/.exec(match[2])?.[1] === heading)
            ) {
                if (containers.length > 0) return [section]
                title = match[2].replace(/\s*\{#[^}]+\}\s*$/, "")
                start = index
                level = match[1].length
            }
        }
        return start < 0
            ? []
            : [
                  {
                      ...section,
                      id: `${section.id}:${heading}`,
                      title,
                      text: lines.slice(start, end).join("\n"),
                  },
              ]
    })
}
