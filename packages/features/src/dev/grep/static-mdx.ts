const escape_markdown = (text: string) =>
    text.replace(/\s+/g, " ").replace(/[\\`*_{}[\]()#+.!<>|~-]/g, "\\$&")

export const static_mdx = (markdown: string) => {
    const lines = markdown.split(/\r?\n/)
    const output: string[] = []
    let fence = ""
    let in_comment = false
    for (let index = 0; index < lines.length; index++) {
        let line = lines[index] ?? ""
        if (fence === "") {
            let visible = ""
            while (line.length > 0) {
                if (in_comment) {
                    const end = line.indexOf("-->")
                    if (end < 0) {
                        line = ""
                        break
                    }
                    line = line.slice(end + 3)
                    in_comment = false
                } else {
                    const start = /^ {0,3}<!--/.test(line)
                        ? line.indexOf("<!--")
                        : -1
                    if (start < 0) {
                        visible += line
                        break
                    }
                    visible += line.slice(0, start)
                    line = line.slice(start + 4)
                    in_comment = true
                }
            }
            line = visible
        }
        const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1]
        if (marker !== undefined) {
            if (fence === "") fence = marker
            else if (
                marker[0] === fence[0] &&
                marker.length >= fence.length &&
                line.trim() === marker
            )
                fence = ""
            output.push(line)
            continue
        }
        if (fence === "" && /^ {0,3}<Screenshot\b/.test(line)) {
            const remaining = lines.slice(index).join("\n")
            const component =
                /^ {0,3}<Screenshot\b(?:\s+[\w:-]+\s*=\s*(?:"[^"]*"|'[^']*')|\s)*\/>[ \t]*(?=\n|$)/.exec(
                    remaining
                )?.[0]
            if (component !== undefined) {
                const alt = /\balt\s*=\s*(?:"([^"]*)"|'([^']*)')/.exec(
                    component
                )
                const caption = alt?.[1] ?? alt?.[2]
                output.push(
                    "",
                    caption === undefined
                        ? "Screenshot omitted."
                        : `Screenshot: ${escape_markdown(caption)} (image omitted).`,
                    ""
                )
                index += component.split("\n").length - 1
                continue
            }
        }
        output.push(line)
    }
    return output.join("\n")
}
