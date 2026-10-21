import { Array as Arr, Match as M, Number as Num, Option, Order } from "effect"
import type { Cell, Row, TableName } from "./query-table.data.ts"
import { kind_of, qualify, table_of } from "./query-table.data.ts"
import type {
    Aggregate,
    AggregateFunction,
    Condition,
    Having,
    Query,
} from "./query-table.query.ts"
import { COUNT_STAR, aggregate_label } from "./query-table.query.ts"

// One entry per clause in SQL's *logical* execution order — which is not the
// order the clauses are written in. Showing the row count after each step is
// the whole point of the lab.
export type Stage = Readonly<{
    clause: string
    detail: string
    row_count: number
    applied: boolean
}>

// Output rows are projections, not table rows, so they carry the identity of
// whatever produced them — a source row, a joined pair, or a group.
export type ResultRow = Readonly<{
    key: string
    cells: Row
}>

export type Result = Readonly<{
    columns: ReadonlyArray<string>
    rows: ReadonlyArray<ResultRow>
    stages: ReadonlyArray<Stage>
    warnings: ReadonlyArray<string>
}>

const qualify_row = (table: TableName, row: Row): Row =>
    Object.fromEntries(
        Object.entries(row).map(([column, cell]) => [
            qualify(table, column),
            cell,
        ])
    )

const null_row = (table: TableName): Row =>
    Object.fromEntries(
        table_of(table).columns.map((column) => [
            qualify(table, column.name),
            null,
        ])
    )

const cell_at = (row: Row, column: string): Cell => row[column] ?? null

const to_number = (cell: Cell): Option.Option<number> => {
    if (cell === null) {
        return Option.none()
    }

    const parsed = typeof cell === "number" ? cell : Number(cell)

    return Number.isNaN(parsed) ? Option.none() : Option.some(parsed)
}

const to_text = (cell: Cell): string => (cell === null ? "" : String(cell))

// `%` and `_` are the SQL wildcards; everything else in the pattern is escaped
// so a learner typing `a.b` does not accidentally get a regex dot.
const like_matches = (value: string, pattern: string): boolean => {
    const escaped = pattern.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
    const translated = escaped.replaceAll("%", ".*").replaceAll("_", ".")

    return new RegExp(`^${translated}$`, "i").test(value)
}

const compare_cells = (left: Cell, right: string, kind: string): number => {
    if (kind === "number") {
        return Option.match(
            Option.all({ left: to_number(left), right: to_number(right) }),
            {
                onNone: () => Number.NaN,
                onSome: (pair) => pair.left - pair.right,
            }
        )
    }

    return to_text(left).localeCompare(right)
}

const matches_condition = (row: Row, condition: Condition): boolean => {
    const cell = cell_at(row, condition.column)
    const kind = kind_of(condition.column)

    const ordered = (predicate: (comparison: number) => boolean): boolean => {
        if (cell === null) {
            return false
        }

        const comparison = compare_cells(cell, condition.value, kind)

        return Number.isNaN(comparison) ? false : predicate(comparison)
    }

    return M.value(condition.operator).pipe(
        M.withReturnType<boolean>(),
        M.when("IS NULL", () => cell === null),
        M.when("IS NOT NULL", () => cell !== null),
        M.when("=", () => cell !== null && ordered((c) => c === 0)),
        M.when("<>", () => cell !== null && ordered((c) => c !== 0)),
        M.when(">", () => ordered((c) => c > 0)),
        M.when("<", () => ordered((c) => c < 0)),
        M.when(">=", () => ordered((c) => c >= 0)),
        M.when("<=", () => ordered((c) => c <= 0)),
        M.when(
            "LIKE",
            () => cell !== null && like_matches(to_text(cell), condition.value)
        ),
        M.when(
            "NOT LIKE",
            () => cell !== null && !like_matches(to_text(cell), condition.value)
        ),
        M.when("IN", () => {
            if (cell === null) {
                return false
            }

            const candidates = condition.value
                .split(",")
                .map((candidate) => candidate.trim())

            return candidates.includes(to_text(cell))
        }),
        M.exhaustive
    )
}

const apply_where = (
    rows: ReadonlyArray<ResultRow>,
    conditions: ReadonlyArray<Condition>,
    combinator: string
): ReadonlyArray<ResultRow> =>
    Arr.filter(rows, ({ cells }) =>
        combinator === "OR"
            ? Arr.some(conditions, (condition) =>
                  matches_condition(cells, condition)
              )
            : Arr.every(conditions, (condition) =>
                  matches_condition(cells, condition)
              )
    )

const row_key = (table: TableName, row: Row): string =>
    `${table}#${to_text(row["id"] ?? null)}`

const join_rows = (
    left_rows: ReadonlyArray<ResultRow>,
    query_join: {
        readonly kind: string
        readonly table: TableName
        readonly left_column: string
        readonly right_column: string
    }
): ReadonlyArray<ResultRow> => {
    const right_rows = Arr.map(
        table_of(query_join.table).rows,
        (row): ResultRow => ({
            key: row_key(query_join.table, row),
            cells: qualify_row(query_join.table, row),
        })
    )
    const empty_right = null_row(query_join.table)
    const empty_left = Arr.match(left_rows, {
        onEmpty: (): Row => ({}),
        onNonEmpty: ([first]) =>
            Object.fromEntries(
                Object.keys(first.cells).map((key) => [key, null])
            ),
    })

    // SQL NULL never equals NULL, so a null key joins to nothing.
    const key_matches = (
        left_row: ResultRow,
        right_row: ResultRow
    ): boolean => {
        const left_cell = cell_at(left_row.cells, query_join.left_column)
        const right_cell = cell_at(right_row.cells, query_join.right_column)

        return (
            left_cell !== null &&
            right_cell !== null &&
            to_text(left_cell) === to_text(right_cell)
        )
    }

    const keep_unmatched_left =
        query_join.kind === "LEFT" || query_join.kind === "FULL"
    const keep_unmatched_right =
        query_join.kind === "RIGHT" || query_join.kind === "FULL"

    const paired = Arr.flatMap(left_rows, (left_row) => {
        const matches = Arr.filter(right_rows, (right_row) =>
            key_matches(left_row, right_row)
        )

        return Arr.match(matches, {
            onEmpty: () =>
                keep_unmatched_left
                    ? [
                          {
                              key: `${left_row.key}+none`,
                              cells: { ...left_row.cells, ...empty_right },
                          },
                      ]
                    : Arr.empty<ResultRow>(),
            onNonEmpty: (found) =>
                Arr.map(found, (right_row) => ({
                    key: `${left_row.key}+${right_row.key}`,
                    cells: { ...left_row.cells, ...right_row.cells },
                })),
        })
    })

    const orphans = keep_unmatched_right
        ? Arr.map(
              Arr.filter(
                  right_rows,
                  (right_row) =>
                      !Arr.some(left_rows, (left_row) =>
                          key_matches(left_row, right_row)
                      )
              ),
              (right_row): ResultRow => ({
                  key: `none+${right_row.key}`,
                  cells: { ...empty_left, ...right_row.cells },
              })
          )
        : Arr.empty<ResultRow>()

    return [...paired, ...orphans]
}

const compute_aggregate = (
    rows: ReadonlyArray<Row>,
    fn: AggregateFunction,
    column: string
): Cell => {
    if (fn === "COUNT" && column === COUNT_STAR) {
        return rows.length
    }

    const present = Arr.filter(rows, (row) => cell_at(row, column) !== null)

    if (fn === "COUNT") {
        return present.length
    }

    const numbers = Arr.flatMap(present, (row) =>
        Option.match(to_number(cell_at(row, column)), {
            onNone: (): ReadonlyArray<number> => [],
            onSome: (value) => [value],
        })
    )

    if (numbers.length === 0) {
        // MIN and MAX still mean something for text columns; SUM and AVG do not.
        const texts = Arr.map(present, (row) => to_text(cell_at(row, column)))

        return Arr.match(texts, {
            onEmpty: () => null,
            onNonEmpty: (values) =>
                M.value(fn).pipe(
                    M.withReturnType<Cell>(),
                    M.when("MIN", () => Arr.min(values, Order.String)),
                    M.when("MAX", () => Arr.max(values, Order.String)),
                    M.orElse(() => null)
                ),
        })
    }

    return Arr.match(numbers, {
        onEmpty: (): Cell => null,
        onNonEmpty: (values) =>
            M.value(fn).pipe(
                M.withReturnType<Cell>(),
                M.when("SUM", () => Num.sumAll(values)),
                M.when(
                    "AVG",
                    () =>
                        Math.round((Num.sumAll(values) / values.length) * 100) /
                        100
                ),
                M.when("MIN", () => Arr.min(values, Order.Number)),
                M.when("MAX", () => Arr.max(values, Order.Number)),
                M.orElse(() => null)
            ),
    })
}

const matches_having = (rows: ReadonlyArray<Row>, having: Having): boolean => {
    const label = aggregate_label(having.fn, having.column)
    const computed: Row = {
        [label]: compute_aggregate(rows, having.fn, having.column),
    }

    return matches_condition(computed, {
        id: "having",
        column: label,
        operator: having.operator,
        value: having.value,
    })
}

type Group = Readonly<{
    key: string
    members: ReadonlyArray<Row>
}>

const group_rows = (
    rows: ReadonlyArray<ResultRow>,
    group_by: ReadonlyArray<string>
): ReadonlyArray<Group> => {
    if (group_by.length === 0) {
        return [{ key: "all", members: Arr.map(rows, (row) => row.cells) }]
    }

    const buckets = new Map<string, Array<Row>>()

    for (const { cells } of rows) {
        const key = JSON.stringify(
            Arr.map(group_by, (column) => cell_at(cells, column))
        )
        const existing = buckets.get(key)

        if (existing === undefined) {
            buckets.set(key, [cells])
        } else {
            existing.push(cells)
        }
    }

    return Arr.map([...buckets.entries()], ([key, members]) => ({
        key,
        members,
    }))
}

const project_group = (
    group: Group,
    group_by: ReadonlyArray<string>,
    aggregates: ReadonlyArray<Aggregate>
): Row => {
    const carried = Arr.match(group.members, {
        onEmpty: (): Row => ({}),
        onNonEmpty: ([first]) =>
            Object.fromEntries(
                Arr.map(group_by, (column) => [column, cell_at(first, column)])
            ),
    })

    const computed = Object.fromEntries(
        Arr.map(aggregates, (aggregate) => [
            aggregate_label(aggregate.fn, aggregate.column),
            compute_aggregate(group.members, aggregate.fn, aggregate.column),
        ])
    )

    return { ...carried, ...computed }
}

const order_rows = (
    rows: ReadonlyArray<ResultRow>,
    column: string,
    direction: string
): ReadonlyArray<ResultRow> => {
    const kind = kind_of(column)
    // Aggregate output columns are not in the catalogue, so fall back to the
    // shape of the first non-null value we can see.
    const numeric =
        kind === "number" ||
        Arr.some(rows, (row) => typeof cell_at(row.cells, column) === "number")

    const compare = (left: ResultRow, right: ResultRow): number => {
        const left_cell = cell_at(left.cells, column)
        const right_cell = cell_at(right.cells, column)

        if (left_cell === null && right_cell === null) {
            return 0
        }

        // NULLs sort last, the PostgreSQL default for ASC.
        if (left_cell === null) {
            return 1
        }

        if (right_cell === null) {
            return -1
        }

        return numeric
            ? Option.match(
                  Option.all({
                      left: to_number(left_cell),
                      right: to_number(right_cell),
                  }),
                  {
                      onNone: () => 0,
                      onSome: (pair) => pair.left - pair.right,
                  }
              )
            : to_text(left_cell).localeCompare(to_text(right_cell))
    }

    const sorted = Arr.sort(
        rows,
        Order.make<ResultRow>((left, right) => {
            const comparison = compare(left, right)

            return comparison < 0 ? -1 : comparison > 0 ? 1 : 0
        })
    )

    return direction === "DESC" ? Arr.reverse(sorted) : sorted
}

const output_columns = (query: Query): ReadonlyArray<string> => {
    const aggregate_columns = Arr.map(query.aggregates, (aggregate) =>
        aggregate_label(aggregate.fn, aggregate.column)
    )

    const grouping = query.group_by.length > 0 || query.aggregates.length > 0

    const selected = grouping
        ? Arr.filter(query.selected_columns, (column) =>
              Arr.contains(query.group_by, column)
          )
        : query.selected_columns

    return Arr.dedupe([
        ...(grouping ? Arr.dedupe([...query.group_by, ...selected]) : selected),
        ...aggregate_columns,
    ])
}

const dedupe_rows = (
    rows: ReadonlyArray<ResultRow>,
    columns: ReadonlyArray<string>
): ReadonlyArray<ResultRow> => {
    const seen = new Set<string>()

    return Arr.filter(rows, (row) => {
        const key = JSON.stringify(
            Arr.map(columns, (column) => cell_at(row.cells, column))
        )

        if (seen.has(key)) {
            return false
        }

        seen.add(key)

        return true
    })
}

export const execute = (query: Query): Result => {
    const warnings: Array<string> = []

    const from_rows = Arr.map(
        table_of(query.from_table).rows,
        (row): ResultRow => ({
            key: row_key(query.from_table, row),
            cells: qualify_row(query.from_table, row),
        })
    )

    const joined = M.value(query.join).pipe(
        M.withReturnType<ReadonlyArray<ResultRow>>(),
        M.tagsExhaustive({
            NoJoin: () => from_rows,
            JoinOn: (join) => join_rows(from_rows, join),
        })
    )

    const filtered = apply_where(joined, query.conditions, query.combinator)

    const grouping = query.group_by.length > 0 || query.aggregates.length > 0
    const groups = grouping ? group_rows(filtered, query.group_by) : []

    const kept_groups = Option.match(query.having, {
        onNone: () => groups,
        onSome: (having) =>
            Arr.filter(groups, (group) =>
                matches_having(group.members, having)
            ),
    })

    const grouped_rows: ReadonlyArray<ResultRow> = grouping
        ? Arr.map(kept_groups, (group) => ({
              key: group.key,
              cells: project_group(group, query.group_by, query.aggregates),
          }))
        : filtered

    if (grouping) {
        const dropped = Arr.filter(
            query.selected_columns,
            (column) => !Arr.contains(query.group_by, column)
        )

        if (dropped.length > 0) {
            warnings.push(
                `${dropped.join(", ")} ${dropped.length === 1 ? "is" : "are"} selected but not grouped or aggregated, so a real database would reject this query. The column has been dropped from the output.`
            )
        }
    }

    const columns = output_columns(query)

    if (columns.length === 0) {
        warnings.push(
            "No output columns. Tick a column under SELECT, or add an aggregate."
        )
    }

    const projected = Arr.map(
        grouped_rows,
        (row): ResultRow => ({
            key: row.key,
            cells: Object.fromEntries(
                Arr.map(columns, (column) => [
                    column,
                    cell_at(row.cells, column),
                ])
            ),
        })
    )

    const distinct = query.distinct
        ? dedupe_rows(projected, columns)
        : projected

    const ordered = Option.match(query.order_by, {
        onNone: () => distinct,
        onSome: ({ column, direction }) =>
            order_rows(distinct, column, direction),
    })

    const offset_rows = Arr.drop(ordered, query.offset)

    const limited = Option.match(query.limit, {
        onNone: () => offset_rows,
        onSome: (limit) => Arr.take(offset_rows, limit),
    })

    const stages: ReadonlyArray<Stage> = [
        {
            clause: "FROM",
            detail: `Read every row of ${query.from_table}.`,
            row_count: from_rows.length,
            applied: true,
        },
        {
            clause: "JOIN",
            detail: M.value(query.join).pipe(
                M.withReturnType<string>(),
                M.tagsExhaustive({
                    NoJoin: () => "No join, so the row set is unchanged.",
                    JoinOn: ({ kind, table, left_column, right_column }) =>
                        `${kind} JOIN ${table} matching ${left_column} to ${right_column}.`,
                })
            ),
            row_count: joined.length,
            applied: query.join._tag === "JoinOn",
        },
        {
            clause: "WHERE",
            detail:
                query.conditions.length === 0
                    ? "No conditions, so every row survives."
                    : `${query.conditions.length} condition${query.conditions.length === 1 ? "" : "s"} joined with ${query.combinator}, tested row by row.`,
            row_count: filtered.length,
            applied: query.conditions.length > 0,
        },
        {
            clause: "GROUP BY",
            detail: grouping
                ? `Collapsed into ${groups.length} group${groups.length === 1 ? "" : "s"}${query.group_by.length === 0 ? " (no GROUP BY, so one group over the whole table)" : ""}.`
                : "No grouping, so rows pass through one for one.",
            row_count: grouping ? groups.length : filtered.length,
            applied: grouping,
        },
        {
            clause: "HAVING",
            detail: Option.match(query.having, {
                onNone: () => "No HAVING, so every group survives.",
                onSome: ({ fn, column, operator, value }) =>
                    `Kept groups where ${aggregate_label(fn, column)} ${operator} ${value}.`,
            }),
            row_count: grouping ? kept_groups.length : filtered.length,
            applied: Option.isSome(query.having),
        },
        {
            clause: "SELECT",
            detail: `Projected ${columns.length} column${columns.length === 1 ? "" : "s"}${query.distinct ? ", then removed duplicate rows with DISTINCT" : ""}.`,
            row_count: distinct.length,
            applied: true,
        },
        {
            clause: "ORDER BY",
            detail: Option.match(query.order_by, {
                onNone: () => "Unordered — the database may return any order.",
                onSome: ({ column, direction }) =>
                    `Sorted by ${column} ${direction}.`,
            }),
            row_count: ordered.length,
            applied: Option.isSome(query.order_by),
        },
        {
            clause: "LIMIT",
            detail: Option.match(query.limit, {
                onNone: () =>
                    query.offset > 0
                        ? `Skipped the first ${query.offset} row${query.offset === 1 ? "" : "s"}.`
                        : "No limit, so every row is returned.",
                onSome: (limit) =>
                    `Returned at most ${limit} row${limit === 1 ? "" : "s"}${query.offset > 0 ? ` after skipping ${query.offset}` : ""}.`,
            }),
            row_count: limited.length,
            applied: Option.isSome(query.limit) || query.offset > 0,
        },
    ]

    return { columns, rows: limited, stages, warnings }
}
