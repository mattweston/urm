import { describe, expect, test } from "vitest"
import { database_error_code } from "@urm/database/sql-error"
import { provision_error_message } from "../scripts/provision-error.ts"

describe("safe provisioning diagnostics", () => {
    test("retains a PostgreSQL code through Effect and driver error wrappers", () => {
        const error = {
            reason: {
                cause: { code: "42P01", detail: "private SQL parameters" },
            },
        }
        const code = database_error_code(error)
        expect(code).toBe("42P01")
        expect(
            provision_error_message({
                _tag: "SqlError",
                operation: "transaction_query",
                code,
            })
        ).toContain("table is missing")
    })
    test("identifies invalid input without echoing the supplied password", () => {
        const message = provision_error_message({
            _tag: "AuthError",
            reason: "invalid_input",
            password: "secret-value",
        })
        expect(message).toContain("15–1024")
        expect(message).not.toContain("secret-value")
    })
    test("does not publish driver messages or unclassified codes", () => {
        const cause = {
            code: "password=secret-value",
            message: "postgres://secret-value",
            detail: "secret-value",
        }
        expect(database_error_code(cause)).toBeUndefined()
        expect(
            provision_error_message({ _tag: "SqlError", cause })
        ).not.toContain("secret-value")
    })
    test("bounds recursive error causes", () => {
        const circular: { cause?: unknown } = {}
        circular.cause = circular
        expect(database_error_code(circular)).toBeUndefined()
    })
})
