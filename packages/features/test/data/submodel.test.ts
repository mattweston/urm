import { describe, expect, it } from "vitest"

import { ChangedPath } from "../../src/data/message.ts"
import { activateDomain, init, update } from "../../src/data/update.ts"

describe("data submodel", () => {
    it("defers tenant-owned CSV without loading the freeform workbook", () => {
        const [model, commands] = init("/data/", "")

        expect(model.route).toBe("Home")
        expect(model.csvUpload.domain_id).toBe("")
        expect(commands).toHaveLength(0)
    })

    it("starts CSV and table state after domain resolution", () => {
        const [model] = init("/data/", "")
        const [next_model, commands] = activateDomain(model, "domain-1")

        expect(next_model.csvUpload.domain_id).toBe("domain-1")
        expect(next_model.tables.domain_id).toBe("domain-1")
        expect(commands).toHaveLength(1)
    })

    it("reuses both children across Data routes", () => {
        const [model] = init("/data/", "domain-1")
        const [next_model, commands] = update(
            model,
            ChangedPath({ pathname: "/data/spreadsheets/" })
        )

        expect(next_model.route).toBe("Spreadsheets")
        expect(next_model.csvUpload).toBe(model.csvUpload)
        expect(next_model.tables).toBe(model.tables)
        expect(commands).toHaveLength(0)
    })

    it("preserves contact import on CSV routes and clears it when leaving", () => {
        const [initial] = init("/data/csv/", "domain-1")
        const model = {
            ...initial,
            tables: { ...initial.tables, contact_import: true },
        }
        const [csv_model] = update(
            model,
            ChangedPath({ pathname: "/data/csv/" })
        )

        expect(csv_model.tables).toBe(model.tables)

        const [next_model, commands] = update(
            csv_model,
            ChangedPath({ pathname: "/data/spreadsheets/" })
        )

        expect(next_model.tables).toEqual({
            ...model.tables,
            contact_import: false,
        })
        expect(next_model.csvUpload).toBe(model.csvUpload)
        expect(commands).toHaveLength(0)
    })
})
