import type { DataColumn, TableDefinition } from "./schemas/data-tables.ts"

const column = (
    key: string,
    name: string,
    type: DataColumn["type"] = "text",
    required = false,
    default_value = ""
): DataColumn => ({ key, name, type, required, default_value, choices: [] })
const contact_columns: ReadonlyArray<DataColumn> = [
    column("name", "Name", "text", true),
    column("email", "Email", "text", true),
    column("tel", "Phone"),
    column("title", "Job title"),
    column("company", "Company"),
]
export const data_templates: ReadonlyArray<{
    id: string
    name: string
    columns: ReadonlyArray<DataColumn>
}> = [
    {
        id: "contacts",
        name: "Contacts",
        columns: contact_columns,
    },
    {
        id: "events",
        name: "Events",
        columns: [
            column("title", "Title", "text", true),
            column("date", "Date", "date", true),
            column("start_time", "Start time", "text", true),
            column("end_time", "End time"),
            column("venue_name", "Venue", "text", true),
            column("description", "Description"),
            column("published", "Published", "boolean", false, "false"),
        ],
    },
    {
        id: "products",
        name: "Products",
        columns: [
            column("name", "Name", "text", true),
            column("slug", "Slug", "text", true),
            column("description", "Description"),
            column("price", "Price", "number", true),
            column("image_url", "Image URL"),
            column("is_active", "Active", "boolean", false, "false"),
            column("is_featured", "Featured", "boolean", false, "false"),
        ],
    },
]
export const contact_destination: TableDefinition = {
    id: "mail-contacts",
    name: "Mail contacts",
    columns: contact_columns,
    revision: 1,
    row_count: 0,
}
const header_aliases: Readonly<Record<string, ReadonlyArray<string>>> = {
    name: ["full name", "contact name"],
    email: ["email address", "e mail"],
    tel: ["phone", "phone number", "telephone"],
    title: ["job title"],
    company: ["company name", "organisation", "organization"],
    date: ["event date"],
    venue_name: ["venue", "location"],
    price: ["unit price"],
}
const normalize_header = (header: string) =>
    header.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ")
export const suggest_header = (
    column: DataColumn,
    headers: ReadonlyArray<string>
): string => {
    const matches = headers.filter((header) =>
        [column.key, column.name, ...(header_aliases[column.key] ?? [])].some(
            (alias) => normalize_header(alias) === normalize_header(header)
        )
    )
    return matches.length === 1 ? (matches[0] ?? "") : ""
}
