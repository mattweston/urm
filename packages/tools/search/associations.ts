import type { DocumentationSection, SourceFile } from "@urm/features/labs/dev/grep"

const unquote = (value: string) => value.replace(/^(["'])(.*)\1$/, "$2")

export const extract_associations = (
    path: string,
    markdown: string,
    files: ReadonlyArray<SourceFile>
) => {
    const lines = markdown.split(/\r?\n/)
    const frontmatter_end = lines[0] === "---" ? lines.indexOf("---", 1) : -1
    const metadata =
        frontmatter_end > 0 ? lines.slice(1, frontmatter_end).join("\n") : ""
    const title = /^title:\s*(.+)$/m.exec(metadata)?.[1] ?? path
    const source_path = /^source:\s*(.+)$/m.exec(metadata)?.[1]
    const alias_value = /^aliases:[ \t]*(.*)$/m.exec(metadata)?.[1] ?? ""
    const aliases =
        alias_value.startsWith("[") && alias_value.endsWith("]")
            ? alias_value
                  .slice(1, -1)
                  .split(",")
                  .map((item) => unquote(item.trim()))
                  .filter(Boolean)
            : (
                  /(?:^|\n)aliases:[ \t]*\n((?:[ \t]+-[ \t]+[^\n]+\n?)*)/.exec(
                      metadata
                  )?.[1] ?? ""
              )
                  .split("\n")
                  .flatMap((line) => {
                      const item = /^[ \t]+-[ \t]+(.+)$/.exec(line)?.[1]
                      return item === undefined ? [] : [unquote(item.trim())]
                  })
    const region_metadata =
        /(?:^|\n)source_regions:[ \t]*\n((?:[ \t]+[^\n]+\n?)*)/.exec(
            metadata
        )?.[1] ?? ""
    const source_regions = new Map(
        region_metadata.split("\n").flatMap((line): [string, string][] => {
            const entry = /^[ \t]+([^:]+):[ \t]*(.+)$/.exec(line)
            return entry?.[1] !== undefined && entry[2] !== undefined
                ? [[unquote(entry[1].trim()), unquote(entry[2].trim())]]
                : []
        })
    )
    const sections: DocumentationSection[] = []
    const diagnostics: string[] = []
    const matched_headings = new Set<string>()
    let heading = unquote(title)
    let section_start = frontmatter_end + 1
    let fence = ""
    let imports: { path: string; region: string | undefined }[] = []
    const flush = (end: number) => {
        const associations: Array<
            DocumentationSection["associations"][number]
        > = []
        const region = source_regions.get(heading)
        const references = [...imports]
        if (region !== undefined) {
            matched_headings.add(heading)
            if (source_path === undefined)
                diagnostics.push(
                    `${path}: source_regions requires a source path`
                )
            else references.push({ path: unquote(source_path), region })
        }
        for (const item of references) {
            const file = files.find((candidate) => candidate.path === item.path)
            if (file === undefined) {
                diagnostics.push(`${path}: source unavailable: ${item.path}`)
                continue
            }
            const source_lines = file.text.split(/\r?\n/)
            if (item.region === undefined) {
                associations.push({
                    source_path: file.path,
                    start_line: 1,
                    end_line: source_lines.length,
                    reason: "Same source file",
                })
                continue
            }
            const starts = source_lines.flatMap((line, index) =>
                line.trim() === `// #region ${item.region}` ? [index] : []
            )
            const start = starts[0]
            let finish = -1
            let depth = 1
            if (start !== undefined && starts.length === 1) {
                for (
                    let index = start + 1;
                    index < source_lines.length;
                    index++
                ) {
                    const line = source_lines[index]?.trim() ?? ""
                    if (line.startsWith("// #region ")) depth++
                    if (
                        line === "// #endregion" ||
                        line.startsWith("// #endregion ")
                    ) {
                        depth--
                        if (depth === 0) {
                            if (
                                line === "// #endregion" ||
                                line === `// #endregion ${item.region}`
                            )
                                finish = index
                            break
                        }
                    }
                }
            }
            if (start === undefined || finish <= start + 1) {
                diagnostics.push(
                    `${path}: missing, empty or ambiguous region: ${item.region}`
                )
                continue
            }
            associations.push({
                source_path: file.path,
                start_line: start + 2,
                end_line: finish,
                reason: "Documents this region",
                region: item.region,
            })
        }
        if (source_path !== undefined) {
            const file = files.find(
                (candidate) => candidate.path === unquote(source_path)
            )
            if (file !== undefined)
                associations.push({
                    source_path: file.path,
                    start_line: 1,
                    end_line: file.text.split(/\r?\n/).length,
                    reason: "Same source file",
                })
        }
        const text = lines.slice(section_start, end).join("\n").trim()
        if (text !== "")
            sections.push({
                id: `${path}:${section_start + 1}`,
                path,
                title: heading,
                page_title: unquote(title),
                aliases,
                text,
                associations,
            })
    }
    for (let index = section_start; index < lines.length; index++) {
        const line = lines[index] ?? ""
        const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1]
        if (marker !== undefined) {
            if (fence === "") fence = marker
            else if (
                marker[0] === fence[0] &&
                marker.length >= fence.length &&
                line.trim() === marker
            )
                fence = ""
            continue
        }
        if (fence !== "") continue
        const next_heading = /^ {0,3}#{1,2}\s+(.+?)(?:\s+#+)?\s*$/.exec(
            line
        )?.[1]
        if (next_heading !== undefined) {
            flush(index)
            heading = next_heading
            section_start = index
            imports = []
        }
        if (line.startsWith(":::ImportedExample")) {
            const declaration =
                /^:::ImportedExample\{path="([^"]+)"(?: region="([^"]+)")?(?: title="([^"]+)")?\}\s*$/.exec(
                    line
                )
            const imported_path = declaration?.[1]
            if (imported_path === undefined)
                diagnostics.push(
                    `${path}:${index + 1}: unsupported source import`
                )
            else imports.push({ path: imported_path, region: declaration?.[2] })
        }
    }
    flush(lines.length)
    for (const region_heading of source_regions.keys())
        if (!matched_headings.has(region_heading))
            diagnostics.push(
                `${path}: source_regions heading not found: ${region_heading}`
            )
    return { sections, diagnostics }
}
