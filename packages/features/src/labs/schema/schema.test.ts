import { Result, Schema as S } from "effect"
import { describe, expect, it } from "vitest"
import {
    Submission,
    decode,
    inspect,
    invalid_draft,
    valid_draft,
} from "./schema.ts"
import {
    AddedAddress,
    ChangedField,
    LoadedExample,
    Model,
    RemovedAddress,
    Submitted,
    init,
    update,
} from "./submodel.ts"

describe("Schema lab", () => {
    it("decodes numeric inputs and encodes them back without changing postal codes", () => {
        const draft = {
            ...valid_draft,
            addresses: [{ city: "Leeds", postal_code: "LS6 1NS" }],
        }
        const result = decode(draft)
        if (Result.isFailure(result)) throw result.failure
        expect(result.success.age).toBe(36)
        expect(result.success.availability).toEqual({ from: 2026, to: 2028 })
        expect(result.success.addresses[0]?.postal_code).toBe("LS6 1NS")
        expect(S.encodeSync(Submission)(result.success)).toEqual(draft)
    })

    it.each(["LS6 1NS", "ls6 1ns", "LS61NS", "SW1A 1AA", "GIR 0AA"])(
        "accepts UK postcode %s without changing the input",
        (postal_code) => {
            const result = decode({
                ...valid_draft,
                addresses: [{ city: "Leeds", postal_code }],
            })
            if (Result.isFailure(result)) throw result.failure
            expect(result.success.addresses[0]?.postal_code).toBe(postal_code)
        }
    )

    it.each(["12345", "LS6", "LS6 1N", "LS6 1NS extra", "LS6 1CI"])(
        "rejects malformed postcode %s",
        (postal_code) => {
            expect(
                inspect({
                    ...valid_draft,
                    addresses: [{ city: "Leeds", postal_code }],
                }).issues.map((issue) => issue.path)
            ).toContain("addresses.0.postal_code")
        }
    )

    it("collects field, cross-field, and indexed address errors together", () => {
        const { issues } = inspect(invalid_draft)
        expect(issues.map((issue) => issue.path)).toEqual(
            expect.arrayContaining([
                "name",
                "email",
                "age",
                "availability.to",
                "addresses.0.city",
                "addresses.0.postal_code",
                "addresses.1.postal_code",
            ])
        )
    })

    it("rejects surrounding whitespace and out-of-range numbers", () => {
        expect(
            Result.isFailure(decode({ ...valid_draft, name: " Ada " }))
        ).toBe(true)
        expect(Result.isFailure(decode({ ...valid_draft, age: "17" }))).toBe(
            true
        )
        expect(Result.isFailure(decode({ ...valid_draft, age: "18.5" }))).toBe(
            true
        )
    })

    it("retains incomplete drafts and only accepts valid submissions", () => {
        const [initial] = init()
        const [blocked] = update(initial, Submitted())
        expect(blocked.last_submission).toBeNull()
        expect(blocked.attempted).toBe(true)
        const [valid] = update(blocked, LoadedExample({ example: "valid" }))
        const [accepted] = update(valid, Submitted())
        expect(accepted.last_submission?.age).toBe(36)
        expect(S.decodeUnknownSync(Model)(accepted)).toEqual(accepted)
        const [edited] = update(
            accepted,
            ChangedField({ field: "age", value: "not a number" })
        )
        const [rejected] = update(edited, Submitted())
        expect(rejected.draft.age).toBe("not a number")
        expect(rejected.last_submission).toEqual(accepted.last_submission)
    })

    it("keeps between one and three editable addresses", () => {
        const [initial] = init()
        expect(update(initial, RemovedAddress({ index: 0 }))[0]).toBe(initial)
        const [two] = update(initial, AddedAddress())
        const [three] = update(two, AddedAddress())
        expect(update(three, AddedAddress())[0]).toBe(three)
        expect(
            update(three, RemovedAddress({ index: 1 }))[0].draft.addresses
        ).toHaveLength(2)
    })
})
