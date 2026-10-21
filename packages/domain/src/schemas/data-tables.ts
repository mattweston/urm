import { Schema as S } from "effect"

export const ColumnType = S.Literals([
    "text",
    "number",
    "boolean",
    "date",
    "choice",
])
/**
 * Custom-table column definition. Keys start with a lowercase ASCII letter
 * and contain at most 64 lowercase letters, digits or underscores. Names
 * contain 1–100 characters with no surrounding whitespace.
 *
 * choices and default_value are required for every type, including types that
 * do not use choices. Defaults are stored as strings and parsed by parse_cell.
 * Decode the shape first, then use validate_columns for cross-column rules
 * and validation of choices and defaults.
 */
export const DataColumn = S.Struct({
    key: S.String.check(S.isPattern(/^[a-z][a-z0-9_]{0,63}$/)),
    name: S.Trimmed.check(S.isMinLength(1), S.isMaxLength(100)),
    type: ColumnType,
    required: S.Boolean,
    choices: S.Array(S.String.check(S.isMaxLength(100))).check(
        S.isMaxLength(50)
    ),
    default_value: S.String.check(S.isMaxLength(2000)),
})
export type DataColumn = typeof DataColumn.Type
/**
 * Validates the shapes of 1–32 custom-table columns. This array schema does not
 * check duplicate/reserved keys or default compatibility; use validate_columns
 * after decoding to enforce those rules.
 */
export const DataColumns = S.Array(DataColumn).check(
    S.isMinLength(1),
    S.isMaxLength(32)
)
export const CellValue = S.Union([S.String, S.Number, S.Boolean, S.Null])
/**
 * Parsed custom-table cells keyed by column key. Cells are strings, numbers,
 * booleans or null. The record schema alone does not check keys or values
 * against a table definition; validate_row performs that conversion and check.
 */
export const RowValues = S.Record(S.String, CellValue)
export type RowValues = typeof RowValues.Type
/**
 * String-valued custom-table input, before column-specific parsing. Use
 * validate_row to apply defaults, reject unknown columns and enforce limits.
 */
export const RawRow = S.Record(S.String, S.String)
export type RawRow = typeof RawRow.Type
export const TableName = S.Trimmed.check(S.isMinLength(1), S.isMaxLength(100))
export const TableDefinition = S.Struct({
    id: S.String,
    name: TableName,
    columns: DataColumns,
    revision: S.Number,
    row_count: S.Number,
})
export type TableDefinition = typeof TableDefinition.Type
export const TableRow = S.Struct({
    id: S.String,
    values: RowValues,
    revision: S.Number,
})
export type TableRow = typeof TableRow.Type

/**
 * Parses one custom-table input using an already-decoded column definition.
 * Blank or whitespace-only input uses the column default. If that is also
 * blank, optional cells become null and required cells throw an Error.
 * Effective input is limited to 2,000 characters before conversion.
 *
 * Text preserves whitespace; choices must match an option exactly. Numbers
 * accept finite decimal/scientific notation. Booleans accept true/yes/1 and
 * false/no/0, ignoring case and surrounding whitespace. Dates accept real
 * YYYY-MM-DD dates and return the trimmed date string.
 *
 * Throws ordinary Errors with the column name for invalid values. This is a
 * synchronous parser, so callers must catch failures at their input boundary.
 */
export const parse_cell = (
    column: DataColumn,
    input: string
): string | number | boolean | null => {
    const value = input.trim() === "" ? column.default_value : input
    if (value.trim() === "") {
        if (column.required) throw new Error(`${column.name} is required`)
        return null
    }
    if (value.length > 2000)
        throw new Error(`${column.name} exceeds 2,000 characters`)
    switch (column.type) {
        case "text":
            return value
        case "choice":
            if (!column.choices.includes(value))
                throw new Error(
                    `${column.name} must be one of: ${column.choices.join(", ")}`
                )
            return value
        case "number": {
            if (
                !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(
                    value.trim()
                ) ||
                !Number.isFinite(Number(value))
            ) {
                throw new Error(`${column.name} must be a finite number`)
            }
            return Number(value)
        }
        case "boolean":
            if (/^(true|yes|1)$/i.test(value.trim())) return true
            if (/^(false|no|0)$/i.test(value.trim())) return false
            throw new Error(`${column.name} must be true or false`)
        case "date": {
            const date = value.trim()
            const timestamp = Date.parse(`${date}T00:00:00Z`)
            if (
                !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
                !Number.isFinite(timestamp) ||
                new Date(timestamp).toISOString().slice(0, 10) !== date
            ) {
                throw new Error(
                    `${column.name} must be a valid YYYY-MM-DD date`
                )
            }
            return date
        }
    }
}

/**
 * Checks 1–32 already-decoded custom-table columns. Keys must be unique and
 * cannot be constructor, prototype or __proto__. Choice columns need at least
 * one option; choices must be distinct and nonblank after trimming.
 *
 * Nonempty defaults are checked with parse_cell. An empty default is allowed
 * even for a required column. Returns void on success and throws an ordinary
 * Error on failure. Does not replace DataColumns schema decoding.
 */
export const validate_columns = (columns: ReadonlyArray<DataColumn>): void => {
    if (columns.length < 1 || columns.length > 32)
        throw new Error("Use between 1 and 32 columns")
    const keys = new Set<string>()
    for (const column of columns) {
        if (
            keys.has(column.key) ||
            ["constructor", "prototype", "__proto__"].includes(column.key)
        )
            throw new Error(
                "Column keys must be unique and cannot be reserved names"
            )
        keys.add(column.key)
        if (
            column.type === "choice" &&
            (column.choices.length === 0 ||
                column.choices.some((choice) => choice.trim() === "") ||
                new Set(column.choices).size !== column.choices.length)
        ) {
            throw new Error(`${column.name} needs unique, nonempty choices`)
        }
        if (column.default_value !== "")
            parse_cell(column, column.default_value)
    }
}

/**
 * Converts a raw string-valued row using previously validated columns. Rejects
 * unknown keys, treats missing columns as blank input and applies parse_cell
 * to every column. The result includes every column key, with null for blank
 * optional cells that have no default.
 *
 * Rejects results whose JSON encoding exceeds 8,000 UTF-8 bytes. Throws ordinary
 * Errors for row limits or cell failures; does not validate the column
 * definitions, authorize access or persist the row.
 */
export const validate_row = (
    columns: ReadonlyArray<DataColumn>,
    raw: RawRow
): RowValues => {
    if (
        Object.keys(raw).some(
            (key) => !columns.some((column) => column.key === key)
        )
    )
        throw new Error("Row contains an unknown column")
    const values = Object.fromEntries(
        columns.map((column) => [
            column.key,
            parse_cell(column, raw[column.key] ?? ""),
        ])
    )
    if (new TextEncoder().encode(JSON.stringify(values)).byteLength > 8000)
        throw new Error("A row cannot exceed 8,000 encoded bytes")
    return values
}

/**
 * Converts parsed cells to editable strings, mapping null to an empty string
 * and other values through String. Does not apply column rules. A later
 * validate_row call may replace these blank strings with column defaults,
 * so this conversion does not guarantee a lossless round trip.
 */
export const raw_values = (values: RowValues): RawRow =>
    Object.fromEntries(
        Object.entries(values).map(([key, value]) => [
            key,
            value === null ? "" : String(value),
        ])
    )
