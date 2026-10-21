import { describe, expect, it } from "vitest"
import { parse_csv } from "../src/csv.ts"
import {
    validate_columns,
    validate_row,
    type DataColumn,
} from "../src/schemas/data-tables.ts"

const column = (type: DataColumn["type"], required = false): DataColumn => ({
    key: "value",
    name: "Value",
    type,
    required,
    choices: ["Open", "Closed"],
    default_value: "",
})
describe("CSV upload parsing", () => {
    it("preserves quoted delimiters, escaped quotes, BOMs, and embedded newlines", () => {
        expect(
            parse_csv(
                '\uFEFFname,note\r\n"West, Matt","He said ""yes""\nNext line"\r\n'
            )
        ).toEqual([{ name: "West, Matt", note: 'He said "yes"\nNext line' }])
    })
    it("rejects malformed files instead of losing columns", () => {
        for (const source of [
            "a,a\n1,2",
            "a,b\n1,2,3",
            'a\n"unfinished',
            'a\n"done"extra',
            "a,\n1,2",
        ])
            expect(() => parse_csv(source)).toThrow(/CSV|quote|Value|Column/)
    })
    it("keeps formula-shaped strings literal and prototype-like headers as data", () => {
        expect(parse_csv("__proto__,formula\nplain,=SUM(A1:A2)")[0]).toEqual({
            ["__proto__"]: "plain",
            formula: "=SUM(A1:A2)",
        })
    })
})
describe("custom table validation", () => {
    it("stores typed values and validates calendar dates", () => {
        expect(validate_row([column("number")], { value: "12.50" })).toEqual({
            value: 12.5,
        })
        expect(validate_row([column("boolean")], { value: "false" })).toEqual({
            value: false,
        })
        expect(validate_row([column("date")], { value: "2024-02-29" })).toEqual(
            { value: "2024-02-29" }
        )
        for (const value of ["2025-02-29", "2026-04-31", "2026-13-01"])
            expect(() => validate_row([column("date")], { value })).toThrow(
                /CSV|quote|Value|Column/
            )
    })
    it("enforces required fields, defaults, finite numbers, and choices", () => {
        expect(
            validate_row(
                [{ ...column("number", true), default_value: "3" }],
                {}
            )
        ).toEqual({ value: 3 })
        expect(() => validate_row([column("text", true)], {})).toThrow(
            /required/
        )
        expect(() =>
            validate_row([column("number")], { value: "Infinity" })
        ).toThrow(/CSV|quote|Value|Column/)
        expect(() =>
            validate_row([column("choice")], { value: "Unknown" })
        ).toThrow(/CSV|quote|Value|Column/)
        expect(() => validate_row([column("text")], { unknown: "x" })).toThrow(
            /unknown/
        )
    })
    it("rejects ambiguous column definitions and invalid defaults", () => {
        expect(() =>
            validate_columns([column("text"), column("number")])
        ).toThrow(/unique/)
        expect(() =>
            validate_columns([{ ...column("text"), key: "constructor" }])
        ).toThrow(/CSV|quote|Value|Column/)
        expect(() =>
            validate_columns([{ ...column("choice"), choices: [] }])
        ).toThrow(/CSV|quote|Value|Column/)
        expect(() =>
            validate_columns([{ ...column("number"), default_value: "abc" }])
        ).toThrow(/CSV|quote|Value|Column/)
    })
})
