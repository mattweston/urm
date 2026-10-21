import { describe, expect, it } from "vitest"
import { AccountRequestError } from "../contacts/api.ts"
import { table_request_error } from "./tables.ts"

describe("table request errors", () => {
    it("shows the duplicate-import explanation", () => {
        expect(
            table_request_error(
                new AccountRequestError({
                    status: 409,
                    message:
                        "This CSV was already imported into this destination. No rows were added.",
                })
            )
        ).toBe(
            "This CSV was already imported into this destination. No rows were added."
        )
    })

    it("does not expose transport error names or server details", () => {
        expect(table_request_error(new Error("internal server detail"))).toBe(
            "Could not complete this table request. Please try again."
        )
    })
})
