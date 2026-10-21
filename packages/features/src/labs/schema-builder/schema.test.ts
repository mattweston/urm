import { describe, expect, it } from "vitest"
import { inspect, initial_fields, definition_errors } from "./schema.ts"
import {
    init,
    update,
    AddedField,
    MovedField,
    RemovedField,
    ChangedField,
} from "./submodel.ts"

describe("Schema builder", () => {
    it("builds schemas and converts encoded numeric and Boolean values", () => {
        const result = inspect(initial_fields)
        expect(result.errors).toEqual([])
        expect(result.value).toEqual({
            title: "Review release",
            estimate: 3,
            status: "open",
            completed: false,
        })
        expect(result.source).toContain(
            '"estimate": S.optionalKey(S.NumberFromString.check(S.isGreaterThanOrEqualTo(0)))'
        )
    })
    it("omits disabled optional keys without treating blank text as absence", () => {
        const fields = initial_fields.map((field) =>
            field.name === "estimate"
                ? { ...field, included: false, value: "invalid" }
                : field
        )
        expect(inspect(fields).value).not.toHaveProperty("estimate")
        expect(inspect(fields).issues).toEqual([])
    })
    it("reports field constraints and invalid Boolean input", () => {
        const result = inspect(
            initial_fields.map((field) => ({
                ...field,
                value: field.kind === "number" ? "-1" : "",
            }))
        )
        expect(result.value).toBeNull()
        expect(result.issues.map((issue) => issue.path)).toEqual(
            expect.arrayContaining(["title", "estimate", "status", "completed"])
        )
    })
    it("blocks invalid definitions before constructing schemas", () => {
        expect(
            definition_errors(
                initial_fields.map((field) => ({ ...field, name: "duplicate" }))
            )
        ).not.toEqual([])
        expect(
            definition_errors(
                initial_fields.map((field) => ({ ...field, name: "__proto__" }))
            )
        ).not.toEqual([])
        expect(
            inspect(
                initial_fields.map((field) => ({
                    ...field,
                    minimum: "NaN",
                    choices: "",
                }))
            ).source
        ).toBe("")
    })
    it("safely quotes choices in generated code", () => {
        const result = inspect(
            initial_fields.map((field) =>
                field.kind === "choice"
                    ? { ...field, choices: 'a"b, c\\d', value: 'a"b' }
                    : field
            )
        )
        expect(result.source).toContain('S.Literals(["a\\"b","c\\\\d"])')
        expect(result.issues).toEqual([])
    })
    it("adds, renames, reorders and removes fields without losing values", () => {
        const [initial] = init()
        const [added] = update(initial, AddedField())
        expect(added.fields).toHaveLength(5)
        const [renamed] = update(
            added,
            ChangedField({ id: 1, property: "name", value: "summary" })
        )
        const [moved] = update(
            renamed,
            MovedField({ id: 1, direction: "down" })
        )
        expect(moved.fields[1]).toMatchObject({
            id: 1,
            name: "summary",
            value: "Review release",
        })
        expect(update(moved, RemovedField({ id: 1 }))[0].fields).toHaveLength(4)
        expect(update(initial, MovedField({ id: 1, direction: "up" }))[0]).toBe(
            initial
        )
    })
    it("supports an empty object schema", () => {
        expect(inspect([]).value).toEqual({})
    })
})
