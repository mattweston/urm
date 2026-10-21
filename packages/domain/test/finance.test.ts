import { Schema } from "effect"
import { describe, expect, it } from "vitest"

import {
    Account,
    CreateAccountInput,
    SetAccountArchivedInput,
    UpdateAccountInput,
} from "../src/finance.ts"
import {
    is_module_enabled,
    module_ids,
    module_settings_version,
    normalize_enabled_modules,
    normalize_sidebar_order,
    SidebarPreference,
} from "../src/schemas/modules.ts"

const account_input = {
    code: "0010",
    name: "Operating bank account",
    category: "asset",
}

describe("financial account contracts", () => {
    it("enables a new module once for older saved preferences", () => {
        const previous = module_ids.filter((id) => id !== "Learn")

        expect(normalize_enabled_modules(previous, undefined)).toContain(
            "Learn"
        )
        expect(
            normalize_enabled_modules(previous, module_settings_version)
        ).not.toContain("Learn")
    })

    it("adds Finance to saved navigation while respecting explicit module settings", () => {
        const sidebar_order = normalize_sidebar_order(["Shop", "Documents"])

        const content_index = sidebar_order.indexOf("Content")

        expect(sidebar_order[0]).toBe("Shop")
        expect(sidebar_order[content_index + 1]).toBe("Documents")
        expect(sidebar_order).not.toContain("Marketing")
        expect(sidebar_order.filter((id) => id === "Finance")).toHaveLength(1)
        expect(
            Schema.is(SidebarPreference)({
                sidebar_order,
                hidden_modules: ["Finance"],
            })
        ).toBe(true)
        expect(is_module_enabled(undefined, "Finance")).toBe(true)
        expect(is_module_enabled(["Shop"], "Finance")).toBe(false)
        expect(is_module_enabled(["Finance"], "Finance")).toBe(true)
    })

    it("preserves user-defined codes including leading zeroes", () => {
        expect(
            Schema.decodeUnknownSync(CreateAccountInput)(account_input)
        ).toEqual(account_input)
    })

    it("rejects invalid write metadata without silently normalizing it", () => {
        for (const changes of [
            { code: "" },
            { code: " 0010" },
            { code: "1".repeat(33) },
            { name: "   " },
            { name: "Bank " },
            { name: "x".repeat(256) },
            { category: "bank" },
            { description: "x".repeat(2001) },
        ]) {
            expect(
                Schema.is(CreateAccountInput)({ ...account_input, ...changes })
            ).toBe(false)
        }
    })

    it("keeps legacy metadata readable even when it needs correction", () => {
        const record = {
            ...account_input,
            id: "account_1",
            code: "",
            name: " Old name ",
            created_at: 1,
            updated_at: 2,
            archived_at: 3,
        }

        expect(Schema.is(Account)(record)).toBe(true)
        expect(Schema.is(CreateAccountInput)(record)).toBe(false)
    })

    it("requires complete replacement metadata and permits clearing description", () => {
        expect(
            Schema.is(UpdateAccountInput)({ id: "account_1", name: "Bank" })
        ).toBe(false)
        expect(
            Schema.is(UpdateAccountInput)({ id: "account_1", ...account_input })
        ).toBe(true)
    })

    it("requires an explicit boolean to archive or restore an account", () => {
        for (const archived of [true, false]) {
            expect(
                Schema.is(SetAccountArchivedInput)({
                    id: "account_1",
                    archived,
                })
            ).toBe(true)
        }
        expect(
            Schema.is(SetAccountArchivedInput)({
                id: "account_1",
                archived: "false",
            })
        ).toBe(false)
    })
})
