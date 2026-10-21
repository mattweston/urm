/**
 * # Schema introspection
 *
 * A serialisable overview of the Drizzle schema, derived from the live
 * table objects so it cannot drift from the code. Importing this module
 * pulls in table definitions only — no connection, config, or env access —
 * so it is safe to use in a static frontend bundle.
 *
 * The public projection is deliberately allowlisted below. It never includes
 * row values, SQL default expressions, database URLs, credentials, or the
 * Drizzle table/config objects themselves.
 */

import { getTableName, is } from "drizzle-orm"
import { getTableConfig, PgTable } from "drizzle-orm/pg-core"

import * as schema_module from "./schema/index.ts"

export interface ColumnOverview {
    readonly name: string
    readonly sql_type: string
    readonly not_null: boolean
    readonly has_default: boolean
    readonly primary_key: boolean
    readonly references: string | null
}

export interface IndexOverview {
    readonly name: string
    readonly unique: boolean
}

export interface TableOverview {
    readonly name: string
    readonly columns: ReadonlyArray<ColumnOverview>
    readonly indexes: ReadonlyArray<IndexOverview>
}

const describe_table = (table: PgTable): TableOverview => {
    const config = getTableConfig(table)

    const references_by_column = new Map<string, string>()
    for (const foreign_key of config.foreignKeys) {
        const { columns, foreignColumns, foreignTable } =
            foreign_key.reference()
        const foreign_table_name = getTableName(foreignTable)
        columns.forEach((column, position) => {
            const foreign = foreignColumns[position]
            if (foreign !== undefined) {
                references_by_column.set(
                    column.name,
                    `${foreign_table_name}.${foreign.name}`
                )
            }
        })
    }

    const composite_primary_keys = new Set(
        config.primaryKeys.flatMap((primary_key) =>
            primary_key.columns.map((column) => column.name)
        )
    )

    return {
        name: config.name,
        columns: config.columns.map((column) => ({
            name: column.name,
            sql_type: column.getSQLType(),
            not_null: column.notNull,
            has_default: column.hasDefault,
            primary_key:
                column.primary || composite_primary_keys.has(column.name),
            references: references_by_column.get(column.name) ?? null,
        })),
        indexes: [
            ...config.indexes.map((index) => ({
                name: index.config.name ?? "(unnamed index)",
                unique: index.config.unique,
            })),
            ...config.uniqueConstraints.map((constraint) => ({
                name: constraint.name ?? "(unnamed constraint)",
                unique: true,
            })),
        ],
    }
}

export const schema_overview: ReadonlyArray<TableOverview> = Object.values(
    schema_module
)
    .flatMap((value) => (is(value, PgTable) ? [describe_table(value)] : []))
    .sort((left, right) => left.name.localeCompare(right.name))
