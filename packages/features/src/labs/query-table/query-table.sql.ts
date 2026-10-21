import { Array as Arr, Match as M, Option } from "effect"
import type { Query } from "./query-table.query.ts"
import { aggregate_label } from "./query-table.query.ts"

// The renderer emits one line per clause instead of one string, so the view can
// colour keywords and link each line back to the control that produced it.
export type SqlLine = Readonly<{
    clause: string
    keyword: string
    body: string
}>

const select_list = (query: Query): string => {
    const grouping = query.group_by.length > 0 || query.aggregates.length > 0

    const columns = grouping
        ? Arr.filter(query.selected_columns, (column) =>
              Arr.contains(query.group_by, column)
          )
        : query.selected_columns

    const aggregates = Arr.map(query.aggregates, (aggregate) =>
        aggregate_label(aggregate.fn, aggregate.column)
    )

    const all = Arr.dedupe([
        ...(grouping ? Arr.dedupe([...query.group_by, ...columns]) : columns),
        ...aggregates,
    ])

    return all.length === 0 ? "*" : all.join(", ")
}

const quote_value = (value: string): string => {
    const trimmed = value.trim()

    if (trimmed === "") {
        return "''"
    }

    return Number.isNaN(Number(trimmed)) ? `'${trimmed}'` : trimmed
}

const condition_text = (condition: {
    readonly column: string
    readonly operator: string
    readonly value: string
}): string =>
    M.value(condition.operator).pipe(
        M.withReturnType<string>(),
        M.when("IS NULL", () => `${condition.column} IS NULL`),
        M.when("IS NOT NULL", () => `${condition.column} IS NOT NULL`),
        M.when(
            "IN",
            () =>
                `${condition.column} IN (${condition.value
                    .split(",")
                    .map((part) => quote_value(part))
                    .join(", ")})`
        ),
        M.orElse(
            () =>
                `${condition.column} ${condition.operator} ${quote_value(condition.value)}`
        )
    )

export const render = (query: Query): ReadonlyArray<SqlLine> => {
    const lines: Array<SqlLine> = [
        {
            clause: "SELECT",
            keyword: query.distinct ? "SELECT DISTINCT" : "SELECT",
            body: select_list(query),
        },
        { clause: "FROM", keyword: "FROM", body: query.from_table },
    ]

    M.value(query.join).pipe(
        M.tagsExhaustive({
            NoJoin: () => undefined,
            JoinOn: ({ kind, table, left_column, right_column }) => {
                lines.push({
                    clause: "JOIN",
                    keyword: `${kind} JOIN`,
                    body: `${table} ON ${left_column} = ${right_column}`,
                })

                return undefined
            },
        })
    )

    if (query.conditions.length > 0) {
        lines.push({
            clause: "WHERE",
            keyword: "WHERE",
            body: Arr.map(query.conditions, condition_text).join(
                ` ${query.combinator} `
            ),
        })
    }

    if (query.group_by.length > 0) {
        lines.push({
            clause: "GROUP BY",
            keyword: "GROUP BY",
            body: query.group_by.join(", "),
        })
    }

    Option.match(query.having, {
        onNone: () => undefined,
        onSome: ({ fn, column, operator, value }) => {
            lines.push({
                clause: "HAVING",
                keyword: "HAVING",
                body: condition_text({
                    column: aggregate_label(fn, column),
                    operator,
                    value,
                }),
            })

            return undefined
        },
    })

    Option.match(query.order_by, {
        onNone: () => undefined,
        onSome: ({ column, direction }) => {
            lines.push({
                clause: "ORDER BY",
                keyword: "ORDER BY",
                body: `${column} ${direction}`,
            })

            return undefined
        },
    })

    Option.match(query.limit, {
        onNone: () => undefined,
        onSome: (limit) => {
            lines.push({
                clause: "LIMIT",
                keyword: "LIMIT",
                body: String(limit),
            })

            return undefined
        },
    })

    if (query.offset > 0) {
        lines.push({
            clause: "OFFSET",
            keyword: "OFFSET",
            body: String(query.offset),
        })
    }

    return lines
}

export const to_text = (query: Query): string =>
    `${Arr.map(render(query), (line) => `${line.keyword} ${line.body}`).join("\n")};`
