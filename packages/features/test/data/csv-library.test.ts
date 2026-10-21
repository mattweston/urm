import { expect, test } from "vitest"
import type { CsvUpload } from "@urm/domain/schemas/csv"
import type { TableDefinition } from "@urm/domain/schemas/data-tables"
import {
    initDeferred,
    update as update_csv,
} from "../../src/data/upload-csv/app.update.ts"
import * as C from "../../src/data/upload-csv/app.message.ts"
import { filtered_uploads } from "../../src/data/upload-csv/library.view.ts"
import { activateDomain, init, update } from "../../src/data/update.ts"
import * as D from "../../src/data/message.ts"
import * as T from "../../src/data/tables/message.ts"

const uploads: ReadonlyArray<CsvUpload> = [
    {
        id: "upload-1",
        filename: "Orders.csv",
        row_count: 2,
        status: "completed",
        updated_at: 2,
    },
    {
        id: "upload-2",
        filename: "orders-retry.csv",
        row_count: 2,
        status: "failed",
        updated_at: 1,
    },
]
const csv_model = () =>
    update_csv(initDeferred("domain-1")[0], C.LoadedUploads({ uploads }))[0]
const table: TableDefinition = {
    id: "table-1",
    name: "Orders",
    columns: [
        {
            key: "quantity",
            name: "Quantity",
            type: "number",
            required: true,
            choices: [],
            default_value: "",
        },
    ],
    revision: 1,
    row_count: 0,
}
const data_model = () => {
    const [model] = init("/data/csv", "domain-1")
    const [with_uploads] = update(
        model,
        D.GotCsvUploadMessage({ message: C.LoadedUploads({ uploads }) })
    )
    return update(
        with_uploads,
        D.GotTableMessage({
            message: T.LoadedTables({
                domain_id: "domain-1",
                can_write: true,
                tables: [table],
            }),
        })
    )[0]
}

test("searches filenames case-insensitively and combines the status filter", () => {
    const [searched] = update_csv(
        csv_model(),
        C.ChangedUploadSearch({ value: " ORDERS " })
    )
    expect(filtered_uploads(searched)).toHaveLength(2)
    const [filtered] = update_csv(
        searched,
        C.ChangedUploadStatus({ value: "failed" })
    )
    expect(filtered_uploads(filtered).map((upload) => upload.id)).toEqual([
        "upload-2",
    ])
})

test("preview reads are scoped and obsolete responses cannot replace the selected file", () => {
    const [loading, commands] = update_csv(
        csv_model(),
        C.ClickedPreviewUpload({ upload_id: "upload-1" })
    )
    expect(commands[0]?.args).toEqual({
        domain_id: "domain-1",
        upload_id: "upload-1",
    })
    expect(
        update_csv(
            csv_model(),
            C.ClickedPreviewUpload({ upload_id: "upload-2" })
        )[1]
    ).toHaveLength(0)
    expect(
        update_csv(
            loading,
            C.LoadedUploadPreview({
                domain_id: "foreign",
                upload_id: "upload-1",
                rows: [],
            })
        )[0]
    ).toBe(loading)
    const [closed] = update_csv(loading, C.ClosedUploadPreview())
    expect(
        update_csv(
            closed,
            C.LoadedUploadPreview({
                domain_id: "domain-1",
                upload_id: "upload-1",
                rows: [{ id: "late", row_index: 0, values: { note: "late" } }],
            })
        )[0]
    ).toBe(closed)
    const [loaded] = update_csv(
        loading,
        C.LoadedUploadPreview({
            domain_id: "domain-1",
            upload_id: "upload-1",
            rows: Array.from({ length: 30 }, (_, row_index) => ({
                id: `row-${row_index}`,
                row_index,
                values: { note: '=literal\n"quoted"' },
            })),
        })
    )
    expect(
        update_csv(loaded, C.ChangedPreviewPage({ page: 20 }))[0].preview_page
    ).toBe(1)
})

test("reactive list refreshes do not unlock an in-progress upload", () => {
    const busy = { ...csv_model(), uploadBusy: true }
    expect(update_csv(busy, C.LoadedUploads({ uploads }))[0].uploadBusy).toBe(
        true
    )
})

test("opens a completed upload directly into mapping and requires validation before persistence", () => {
    const [opened] = update(
        data_model(),
        D.GotCsvUploadMessage({
            message: C.ClickedTableImport({ upload_id: "upload-1" }),
        })
    )
    expect(opened.csv_import_open).toBe(true)
    const [loading, commands] = update(
        opened,
        D.SelectedImportTable({ table_id: "table-1" })
    )
    expect(commands[0]?.args).toEqual({
        domain_id: "domain-1",
        request: { _tag: "ReadUpload", upload_id: "upload-1" },
    })
    expect(update(loading, D.ClosedCsvImport())[0]).toBe(loading)
    const [mapped] = update(
        loading,
        D.GotTableMessage({
            message: T.CompletedRequest({
                domain_id: "domain-1",
                operation: "ReadUpload",
                created_id: "",
                source_rows: [{ Quantity: "3" }],
            }),
        })
    )
    expect(mapped.tables.mapping).toEqual({ quantity: "Quantity" })
    expect(
        update(mapped, D.GotTableMessage({ message: T.SubmittedImport() }))[1]
    ).toHaveLength(0)
    const [previewed] = update(
        mapped,
        D.GotTableMessage({ message: T.PreviewedImport() })
    )
    expect(
        update(
            previewed,
            D.GotTableMessage({ message: T.SubmittedImport() })
        )[1][0]?.args
    ).toMatchObject({
        request: {
            _tag: "Append",
            table_id: "table-1",
            rows: [{ quantity: "3" }],
        },
    })
    expect(activateDomain(opened, "domain-2")[0].csv_import_open).toBe(false)
})

test("read-only members cannot import and unfinished uploads cannot enter mapping", () => {
    const model = data_model()
    expect(
        update(
            model,
            D.GotCsvUploadMessage({
                message: C.ClickedTableImport({ upload_id: "upload-2" }),
            })
        )[0]
    ).toBe(model)
    const member = { ...model, tables: { ...model.tables, can_write: false } }
    expect(
        update(
            member,
            D.GotCsvUploadMessage({
                message: C.ClickedTableImport({ upload_id: "upload-1" }),
            })
        )[0]
    ).toBe(member)
    expect(
        update_csv(
            csv_model(),
            C.ClickedImportUpload({ uploadId: "upload-1" })
        )[1]
    ).toHaveLength(0)
})

test("Mail contact imports use mapping and block invalid data before issuing a batch", () => {
    const [opened, commands] = update(
        data_model(),
        D.GotCsvUploadMessage({
            message: C.ClickedImportUpload({ uploadId: "upload-1" }),
        })
    )
    expect(opened.tables.contact_import).toBe(true)
    expect(opened.tables.selected_id).toBe("")
    expect(commands.some((command) => command.name === "PersistTable")).toBe(
        true
    )
    const [mapped] = update(
        opened,
        D.GotTableMessage({
            message: T.CompletedRequest({
                domain_id: "domain-1",
                operation: "ReadUpload",
                created_id: "",
                source_rows: [{ "Full Name": "Alice", "Email Address": "bad" }],
            }),
        })
    )
    expect(mapped.tables.mapping.email).toBe("Email Address")
    const [blocked, writes] = update(
        mapped,
        D.GotTableMessage({ message: T.SubmittedImport() })
    )
    expect(writes).toHaveLength(0)
    expect(blocked.tables.error).toContain("Row 1, email")
    const valid = {
        ...mapped,
        tables: {
            ...mapped.tables,
            source_rows: [
                { "Full Name": "Alice", "Email Address": "alice@example.com" },
            ],
        },
    }
    const [previewed] = update(
        valid,
        D.GotTableMessage({ message: T.PreviewedImport() })
    )
    expect(
        update(
            previewed,
            D.GotTableMessage({ message: T.SubmittedImport() })
        )[1][0]?.args
    ).toMatchObject({ request: { _tag: "ImportContacts" } })
    expect(
        update(previewed, D.ClosedCsvImport())[0].tables.contact_import
    ).toBe(false)
})

test("recovery requires a selected file and respects completed/read-only states", () => {
    const admin = { ...csv_model(), can_write: true }
    const [missing, commands] = update_csv(
        admin,
        C.RetriedUpload({ upload_id: "upload-2" })
    )
    expect(commands).toHaveLength(0)
    expect(missing.error).toContain("original CSV")
    expect(
        update_csv(admin, C.RetriedUpload({ upload_id: "upload-1" }))[0]
    ).toBe(admin)
    const member = csv_model()
    expect(
        update_csv(member, C.RetriedUpload({ upload_id: "upload-2" }))[0]
    ).toBe(member)
})
