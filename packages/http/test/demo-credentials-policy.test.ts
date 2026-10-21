import { describe, expect, it } from "vitest"
import { demoCredentialsPolicy } from "../src/demo-credentials-policy.ts"

describe("demo credentials policy", () => {
    it("allows demo credentials only when explicitly enabled", () => {
        expect(demoCredentialsPolicy(true)).toEqual({ allowed: true })
    })

    it("blocks demo credentials when the flag is off", () => {
        expect(demoCredentialsPolicy(false)).toEqual({
            allowed: false,
            reason_class: "policy_denied",
        })
    })
})
