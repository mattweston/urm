import { describe, expect, it } from "vitest"
import { DatabaseError } from "@urm/domain/errors"
import { databaseError } from "../src/handlers/errors.ts"

describe("RPC persistence errors", () => {
    it("does not expose a persistence failure to the client", () => {
        const result = databaseError("Failed to fetch audit events")(
            new Error("relation audit_events does not exist")
        )

        expect(result).toBeInstanceOf(DatabaseError)
        expect(result.message).toBe("Failed to fetch audit events")
        expect(result.message).not.toContain("audit_events does not exist")
    })
})
