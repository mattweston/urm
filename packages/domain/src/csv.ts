export const parse_csv = (
    source: string
): ReadonlyArray<Record<string, string>> => {
    if (source.length > 1_000_000)
        throw new Error("CSV exceeds the 1 MB text limit")
    const text = source.replace(/^\uFEFF/, "")
    const rows: string[][] = []
    let row: string[] = []
    let field = ""
    let quoted = false
    let closed_quote = false
    const finish_field = () => {
        row.push(field)
        field = ""
        closed_quote = false
        if (row.length > 200) throw new Error("CSV exceeds 200 columns")
    }
    const finish_row = () => {
        finish_field()
        if (row.some((value) => value !== "")) rows.push(row)
        row = []
        if (rows.length > 1001) throw new Error("CSV exceeds 1,000 data rows")
    }
    for (let index = 0; index < text.length; index++) {
        const character = text[index]
        if (quoted) {
            if (character === '"') {
                if (text[index + 1] === '"') {
                    field += '"'
                    index++
                } else {
                    quoted = false
                    closed_quote = true
                }
            } else field += character
        } else if (character === ",") finish_field()
        else if (character === "\r" || character === "\n") {
            if (character === "\r" && text[index + 1] === "\n") index++
            finish_row()
        } else if (character === '"' && field === "" && !closed_quote)
            quoted = true
        else {
            if (closed_quote || character === '"')
                throw new Error("Invalid quote in CSV field")
            field += character
        }
    }
    if (quoted) throw new Error("Unterminated quoted CSV field")
    if (field !== "" || row.length > 0 || closed_quote) finish_row()
    const headers = rows[0]?.map((header) => header.trim())
    if (headers === undefined || rows.length < 2)
        throw new Error(
            "CSV must include a header row and at least one data row"
        )
    if (
        headers.some((header) => header === "") ||
        new Set(headers).size !== headers.length
    )
        throw new Error("CSV headers must be nonempty and unique")
    return rows.slice(1).map((values, index) => {
        if (values.length !== headers.length)
            throw new Error(
                `CSV row ${index + 2} has ${values.length} fields; expected ${headers.length}`
            )
        return Object.fromEntries(
            headers.map((header, column) => [header, values[column] ?? ""])
        )
    })
}
