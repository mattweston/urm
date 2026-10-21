import { Option } from "effect"
import { describe, expect, it } from "vitest"

import { qualify } from "../src/labs/query-table/query-table.data.ts"
import {
    AddedAggregate,
    AddedCondition,
    ChangedConditionColumn,
    ChangedLimit,
    ChangedOffset,
    RemovedCondition,
    ResetQuery,
    SelectedFromTable,
    SelectedJoinKind,
    SelectedJoinTable,
    SelectedLesson,
    SelectedOrderByColumn,
    ToggledColumn,
    ToggledDistinct,
    ToggledGroupByColumn,
    ToggledHaving,
} from "../src/labs/query-table/query-table.message.ts"
import type { Message } from "../src/labs/query-table/query-table.message.ts"
import type { Model } from "../src/labs/query-table/query-table.model.ts"
import { init, update } from "../src/labs/query-table/query-table.update.ts"

const contact = (column: string) => qualify("contacts", column)
const company = (column: string) => qualify("companies", column)

const start = (): Model => init()[0]

const fold = (messages: ReadonlyArray<Message>): Model =>
    messages.reduce<Model>(
        (model, message) => update(model, message)[0],
        start()
    )

describe("query-table update", () => {
    it("issues no commands — the lab is pure", () => {
        expect(init()[1]).toEqual([])
        expect(update(start(), ToggledDistinct())[1]).toEqual([])
    })

    it("toggles a column off and back on", () => {
        const off = fold([ToggledColumn({ column: contact("city") })])
        const on = update(off, ToggledColumn({ column: contact("city") }))[0]

        expect(off.query.selected_columns).not.toContain(contact("city"))
        expect(on.query.selected_columns).toContain(contact("city"))
    })

    it("gives each added condition its own id", () => {
        const model = fold([AddedCondition(), AddedCondition()])
        const ids = model.query.conditions.map((condition) => condition.id)

        expect(new Set(ids).size).toBe(2)

        const removed = update(model, RemovedCondition({ id: ids[0] ?? "" }))[0]

        expect(removed.query.conditions).toHaveLength(1)
        expect(removed.query.conditions[0]?.id).toBe(ids[1])
    })

    it("clears a condition's value when its column changes", () => {
        const model = fold([AddedCondition()])
        const id = model.query.conditions[0]?.id ?? ""
        const edited = update(
            {
                ...model,
                query: {
                    ...model.query,
                    conditions: [
                        {
                            id,
                            column: contact("status"),
                            operator: "=",
                            value: "active",
                        },
                    ],
                },
            },
            ChangedConditionColumn({ id, column: contact("country") })
        )[0]

        expect(edited.query.conditions[0]?.value).toBe("")
    })

    it("opens a join with a sensible default and closes it again", () => {
        const joined = fold([SelectedJoinKind({ kind: "LEFT" })])

        expect(joined.query.join._tag).toBe("JoinOn")

        const closed = update(joined, SelectedJoinKind({ kind: "" }))[0]

        expect(closed.query.join._tag).toBe("NoJoin")
    })

    // Dropping a join must not leave clauses pointing at columns that no
    // longer exist, or the SQL would name a table that is not in the query.
    it("prunes clauses that referenced the joined table", () => {
        const joined = fold([
            SelectedJoinKind({ kind: "INNER" }),
            SelectedJoinTable({ table: "companies" }),
            ToggledColumn({ column: company("name") }),
            ToggledGroupByColumn({ column: company("industry") }),
        ])

        expect(joined.query.selected_columns).toContain(company("name"))

        const closed = update(joined, SelectedJoinKind({ kind: "" }))[0]

        expect(closed.query.selected_columns).not.toContain(company("name"))
        expect(closed.query.group_by).not.toContain(company("industry"))
    })

    it("starts over when the source table changes", () => {
        const switched = fold([
            AddedCondition(),
            SelectedFromTable({ table: "deals" }),
        ])

        expect(switched.query.from_table).toBe("deals")
        expect(switched.query.conditions).toEqual([])
        expect(switched.query.selected_columns).toContain(
            qualify("deals", "amount")
        )
    })

    it("adds COUNT(*) as the default aggregate", () => {
        const model = fold([AddedAggregate()])

        expect(model.query.aggregates[0]?.fn).toBe("COUNT")
        expect(model.query.aggregates[0]?.column).toBe("*")
    })

    it("toggles HAVING on and off", () => {
        const on = fold([ToggledHaving()])
        const off = update(on, ToggledHaving())[0]

        expect(Option.isSome(on.query.having)).toBe(true)
        expect(Option.isNone(off.query.having)).toBe(true)
    })

    it("keeps the direction when the order column changes", () => {
        const model = fold([SelectedOrderByColumn({ column: contact("city") })])

        expect(Option.isSome(model.query.order_by)).toBe(true)

        const cleared = update(model, SelectedOrderByColumn({ column: "" }))[0]

        expect(Option.isNone(cleared.query.order_by)).toBe(true)
    })

    it("treats an empty or negative limit as no limit", () => {
        expect(
            Option.isNone(fold([ChangedLimit({ value: "" })]).query.limit)
        ).toBe(true)
        expect(
            Option.isNone(fold([ChangedLimit({ value: "-3" })]).query.limit)
        ).toBe(true)
        expect(fold([ChangedLimit({ value: "5" })]).query.limit).toEqual(
            Option.some(5)
        )
        expect(fold([ChangedOffset({ value: "abc" })]).query.offset).toBe(0)
    })

    it("loads a lesson and detaches it on the next hand edit", () => {
        const loaded = fold([SelectedLesson({ id: "inner-join" })])

        expect(loaded.active_lesson).toEqual(Option.some("inner-join"))
        expect(loaded.query.join._tag).toBe("JoinOn")

        const edited = update(loaded, ToggledDistinct())[0]

        expect(Option.isNone(edited.active_lesson)).toBe(true)
        expect(edited.query.join._tag).toBe("JoinOn")
    })

    it("ignores an unknown lesson id", () => {
        const model = start()

        expect(update(model, SelectedLesson({ id: "nope" }))[0]).toBe(model)
    })

    it("resets back to a bare contacts query", () => {
        const model = fold([SelectedLesson({ id: "having" }), ResetQuery()])

        expect(model.query.from_table).toBe("contacts")
        expect(model.query.join._tag).toBe("NoJoin")
        expect(model.query.aggregates).toEqual([])
        expect(Option.isNone(model.active_lesson)).toBe(true)
    })
})
