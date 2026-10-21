import { Option } from "effect"
import { describe, expect, it } from "vitest"

import { qualify, tables } from "../src/labs/query-table/query-table.data.ts"
import { execute } from "../src/labs/query-table/query-table.engine.ts"
import { lessons } from "../src/labs/query-table/query-table.lesson.ts"
import {
    COUNT_STAR,
    JoinOn,
    empty_query,
} from "../src/labs/query-table/query-table.query.ts"
import type { Query } from "../src/labs/query-table/query-table.query.ts"
import { to_text } from "../src/labs/query-table/query-table.sql.ts"

const contact = (column: string) => qualify("contacts", column)
const company = (column: string) => qualify("companies", column)

const lesson = (id: string): Query => {
    const found = lessons.find((candidate) => candidate.id === id)

    if (found === undefined) {
        throw new Error(`no lesson ${id}`)
    }

    return found.query
}

const stage_count = (query: Query, clause: string): number => {
    const stage = execute(query).stages.find(
        (candidate) => candidate.clause === clause
    )

    if (stage === undefined) {
        throw new Error(`no stage ${clause}`)
    }

    return stage.row_count
}

describe("query-table engine", () => {
    it("reads every row of the source table", () => {
        expect(execute(empty_query).rows).toHaveLength(
            tables.contacts.rows.length
        )
    })

    it("keeps SELECT from changing the row count", () => {
        const narrowed: Query = {
            ...empty_query,
            selected_columns: [contact("country")],
        }

        expect(execute(narrowed).rows).toHaveLength(24)
        expect(execute(narrowed).columns).toEqual([contact("country")])
    })

    it("collapses repeated rows under DISTINCT", () => {
        const distinct: Query = {
            ...empty_query,
            selected_columns: [contact("country")],
            distinct: true,
        }

        expect(execute(distinct).rows).toHaveLength(9)
    })

    it("narrows with AND and widens with OR", () => {
        const conjunction = lesson("where-and")
        const disjunction: Query = { ...conjunction, combinator: "OR" }

        expect(execute(conjunction).rows).toHaveLength(5)
        expect(execute(disjunction).rows).toHaveLength(17)
    })

    it("matches LIKE patterns case-insensitively with % and _", () => {
        expect(execute(lesson("like")).rows).toHaveLength(4)
    })

    it("finds NULLs only through IS NULL", () => {
        const is_null = lesson("is-null")
        const equality: Query = {
            ...is_null,
            conditions: [
                {
                    id: "c1",
                    column: contact("company_id"),
                    operator: "=",
                    value: "",
                },
            ],
        }

        expect(execute(is_null).rows).toHaveLength(4)
        expect(execute(equality).rows).toHaveLength(0)
    })

    // The join lessons only teach anything if the row counts actually differ.
    it("distinguishes the four join kinds", () => {
        expect(execute(lesson("inner-join")).rows).toHaveLength(20)
        expect(execute(lesson("left-join")).rows).toHaveLength(24)
        expect(execute(lesson("right-join")).rows).toHaveLength(21)

        const full: Query = {
            ...lesson("inner-join"),
            join: JoinOn({
                kind: "FULL",
                table: "companies",
                left_column: contact("company_id"),
                right_column: company("id"),
            }),
        }

        expect(execute(full).rows).toHaveLength(25)
    })

    // The deals lesson's copy quotes these numbers, so they are pinned here.
    it("multiplies rows on a one-to-many join", () => {
        const rows = execute(lesson("deals-join")).rows
        const contacts_reached = new Set(
            rows.map((row) => String(row.cells[contact("last_name")]))
        )
        const doubled = [...contacts_reached].filter(
            (name) =>
                rows.filter(
                    (row) => String(row.cells[contact("last_name")]) === name
                ).length === 2
        )

        expect(rows).toHaveLength(22)
        expect(contacts_reached.size).toBe(19)
        expect(doubled).toHaveLength(3)
    })

    it("never joins a NULL key to a NULL key", () => {
        const inner = execute(lesson("inner-join"))

        expect(
            inner.rows.every((row) => row.cells[company("name")] !== null)
        ).toBe(true)
    })

    it("counts rows per group", () => {
        const grouped = execute(lesson("group-count"))

        expect(grouped.columns).toEqual([contact("country"), "COUNT(*)"])
        expect(grouped.rows).toHaveLength(9)
        expect(grouped.rows[0]?.cells["COUNT(*)"]).toBe(7)
    })

    it("reproduces lifetime_value by summing won deals per contact", () => {
        const summed: Query = {
            ...empty_query,
            selected_columns: [],
            join: JoinOn({
                kind: "INNER",
                table: "deals",
                left_column: contact("id"),
                right_column: qualify("deals", "contact_id"),
            }),
            group_by: [contact("id"), contact("lifetime_value")],
            aggregates: [
                { id: "a1", fn: "SUM", column: qualify("deals", "amount") },
            ],
        }

        const rows = execute(summed).rows

        expect(rows).toHaveLength(19)
        expect(
            rows.every(
                (row) =>
                    row.cells[contact("lifetime_value")] ===
                    row.cells["SUM(deals.amount)"]
            )
        ).toBe(true)
    })

    it("filters groups with HAVING, not WHERE", () => {
        const having = lesson("having")

        expect(stage_count(having, "GROUP BY")).toBe(6)
        expect(stage_count(having, "HAVING")).toBe(2)
        expect(execute(having).rows).toHaveLength(2)
    })

    it("drops ungrouped columns and says so", () => {
        const invalid: Query = {
            ...lesson("group-count"),
            selected_columns: [contact("first_name")],
        }

        const result = execute(invalid)

        expect(result.columns).not.toContain(contact("first_name"))
        expect(result.warnings).toHaveLength(1)
    })

    it("sorts NULLs last on ASC", () => {
        const sorted: Query = {
            ...empty_query,
            selected_columns: [contact("company_id")],
            order_by: Option.some({
                column: contact("company_id"),
                direction: "ASC",
            }),
        }

        const rows = execute(sorted).rows

        expect(rows[0]?.cells[contact("company_id")]).toBe(1)
        expect(rows.at(-1)?.cells[contact("company_id")]).toBeNull()
    })

    it("applies OFFSET before LIMIT", () => {
        const paged: Query = {
            ...lesson("order-limit"),
            limit: Option.some(3),
            offset: 2,
        }

        const rows = execute(paged).rows

        expect(rows).toHaveLength(3)
        expect(rows[0]?.cells[contact("lifetime_value")]).toBe(19800)
    })

    it("gives every output row a distinct key", () => {
        const duplicated = lessons.filter((entry) => {
            const rows = execute(entry.query).rows

            return new Set(rows.map((row) => row.key)).size !== rows.length
        })

        expect(duplicated.map((entry) => entry.id)).toEqual([])
    })

    it("renders each clause the query actually carries", () => {
        expect(to_text(empty_query)).toBe(
            [
                "SELECT contacts.first_name, contacts.last_name, contacts.city, contacts.country, contacts.status, contacts.lifetime_value",
                "FROM contacts;",
            ].join("\n")
        )

        expect(to_text(lesson("having"))).toBe(
            [
                "SELECT companies.name, COUNT(*)",
                "FROM contacts",
                "INNER JOIN companies ON contacts.company_id = companies.id",
                "GROUP BY companies.name",
                "HAVING COUNT(*) > 3;",
            ].join("\n")
        )
    })

    it("quotes text values and leaves numbers bare", () => {
        const mixed: Query = {
            ...empty_query,
            conditions: [
                {
                    id: "c1",
                    column: contact("status"),
                    operator: "=",
                    value: "active",
                },
                {
                    id: "c2",
                    column: contact("lifetime_value"),
                    operator: ">=",
                    value: "10000",
                },
            ],
        }

        expect(to_text(mixed)).toContain(
            "WHERE contacts.status = 'active' AND contacts.lifetime_value >= 10000"
        )
    })

    it("counts every row with COUNT(*) but skips NULLs otherwise", () => {
        const counted: Query = {
            ...empty_query,
            selected_columns: [],
            aggregates: [
                { id: "a1", fn: "COUNT", column: COUNT_STAR },
                { id: "a2", fn: "COUNT", column: contact("company_id") },
            ],
        }

        const cells = execute(counted).rows[0]?.cells

        expect(cells?.["COUNT(*)"]).toBe(24)
        expect(cells?.["COUNT(contacts.company_id)"]).toBe(20)
    })
})
