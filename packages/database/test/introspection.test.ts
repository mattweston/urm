import { describe, expect, it } from "vitest"

import { schema_overview } from "../src/introspection.ts"

describe("schema introspection", () => {
    it("exports only the allowlisted schema metadata", () => {
        expect(schema_overview.length).toBeGreaterThan(0)

        for (const table of schema_overview) {
            expect(Object.keys(table).sort()).toEqual([
                "columns",
                "indexes",
                "name",
            ])

            for (const column of table.columns) {
                expect(Object.keys(column).sort()).toEqual([
                    "has_default",
                    "name",
                    "not_null",
                    "primary_key",
                    "references",
                    "sql_type",
                ])
            }

            for (const index of table.indexes) {
                expect(Object.keys(index).sort()).toEqual(["name", "unique"])
            }
        }
    })
})
