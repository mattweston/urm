/** # Workspace-scoped CSV and custom-table persistence */
import { randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { Context, Effect, Layer, Schema } from "effect"
import { require_account_domain, type AccountPrincipal } from "@urm/auth"
import { Sql, query_rows } from "@urm/database/sql"
import { CsvUpload, CsvData } from "@urm/domain/schemas/csv"
import {
    DataColumns,
    RowValues,
    TableDefinition,
    TableRow,
    validate_columns,
    validate_row,
} from "@urm/domain/schemas/data-tables"
import { DataAction, DataWriteError } from "@urm/domain/data"

/** Authenticated account and selected workspace, reauthorized for each operation. */
export interface DataPrincipal extends AccountPrincipal {
    readonly domain_id: string
}
const denied = (message = "Data is unavailable, changed, or access denied") =>
    new DataWriteError({ message })
const same_values = (
    left: typeof RowValues.Type,
    right: typeof RowValues.Type
) =>
    Object.keys(left).length === Object.keys(right).length &&
    Object.entries(left).every(([key, value]) => Object.is(value, right[key]))
const same_columns = (
    left: typeof DataColumns.Type,
    right: typeof DataColumns.Type
) =>
    left.length === right.length &&
    left.every((column, index) => {
        const other = right[index]
        return (
            other !== undefined &&
            column.key === other.key &&
            column.name === other.name &&
            column.type === other.type &&
            column.required === other.required &&
            column.default_value === other.default_value &&
            column.choices.length === other.choices.length &&
            column.choices.every(
                (choice, choice_index) => choice === other.choices[choice_index]
            )
        )
    })
const Id = Schema.Struct({ id: Schema.String })
const authorize = Effect.fn("Data.authorize")(function* (
    principal: DataPrincipal,
    domain_id: string,
    write = false
) {
    if (domain_id !== principal.domain_id) return yield* Effect.fail(denied())
    yield* require_account_domain(principal, domain_id, write, "Data")
})
const load_workspace = Effect.fn("Data.loadWorkspace")(function* (
    principal: DataPrincipal
) {
    yield* authorize(principal, principal.domain_id)
    const domain_id = principal.domain_id
    const tables = yield* query_rows(
        TableDefinition,
        sql`SELECT id,name,columns,revision,row_count FROM data_tables WHERE domain_id=${domain_id} ORDER BY updated_at DESC,id LIMIT 101`
    )
    const uploads = yield* query_rows(
        CsvUpload,
        sql`SELECT id,filename,row_count,status,updated_at::float8 AS updated_at,uploader_id,uploader_name,imports FROM csv_uploads WHERE domain_id=${domain_id} ORDER BY updated_at DESC,id LIMIT 101`
    )
    if (tables.length > 100 || uploads.length > 100)
        return yield* Effect.fail(
            denied("Data catalog exceeds its 100-item limit")
        )
    const can_write = yield* authorize(principal, domain_id, true).pipe(
        Effect.as(true),
        Effect.catch(() => Effect.succeed(false))
    )
    return { id: domain_id, can_write, tables, uploads }
})
const load_table_rows = Effect.fn("Data.loadTableRows")(function* (
    principal: DataPrincipal,
    table_id: string
) {
    yield* authorize(principal, principal.domain_id)
    const table = yield* query_rows(
        Id,
        sql`SELECT id FROM data_tables WHERE domain_id=${principal.domain_id} AND id=${table_id}`
    )
    if (!table[0]) return yield* Effect.fail(denied())
    const rows = yield* query_rows(
        TableRow,
        sql`SELECT id,values,revision FROM data_table_rows WHERE domain_id=${principal.domain_id} AND table_id=${table_id} ORDER BY position,id LIMIT 1001`
    )
    if (rows.length > 1000) return yield* Effect.fail(denied())
    return { id: table_id, domain_id: principal.domain_id, rows }
})
const load_upload_rows = Effect.fn("Data.loadUploadRows")(function* (
    principal: DataPrincipal,
    upload_id: string
) {
    yield* authorize(principal, principal.domain_id)
    const upload = yield* query_rows(
        Id,
        sql`SELECT id FROM csv_uploads WHERE domain_id=${principal.domain_id} AND id=${upload_id}`
    )
    if (!upload[0]) return yield* Effect.fail(denied())
    const rows = yield* query_rows(
        CsvData,
        sql`SELECT id,upload_id,row_index,data,updated_at::float8 AS updated_at FROM csv_data WHERE domain_id=${principal.domain_id} AND upload_id=${upload_id} ORDER BY row_index LIMIT 1001`
    )
    if (rows.length > 1000) return yield* Effect.fail(denied())
    return { id: upload_id, domain_id: principal.domain_id, rows }
})
/**
 * Commits a Data command and its returned workspace snapshot in one transaction.
 * The domain lock serializes workspace-wide upload and table limits; table and
 * row revisions reject writes based on stale schemas or values.
 *
 * CSV metadata and rows commit together so retries never encounter a partially
 * stored upload. Reused upload ids must match the original content. Appends use
 * caller-assigned row ids and compare existing values and ownership before
 * treating a retry as complete; an id alone is not evidence of the same command.
 * Stored positions preserve import order when timestamps coincide.
 *
 * Contact imports commit through Contacts first. Recording their source history
 * requires that committed receipt to belong to this account and workspace, so a
 * client cannot invent completion or borrow another account's import result.
 */
const change = Effect.fn("Data.change")(function* (
    principal: DataPrincipal,
    input: DataAction
) {
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const tx = yield* Sql
            const domain_id = principal.domain_id
            const owner = yield* query_rows(
                Id,
                sql`SELECT id FROM domains WHERE id=${domain_id} FOR UPDATE`
            )
            if (!owner[0]) return yield* Effect.fail(denied())
            yield* authorize(principal, domain_id, true)
            const action = yield* Schema.decodeUnknownEffect(DataAction)(input)
            const now = Date.now()
            let changed_id = ""
            if (action._tag === "StoreCsv") {
                const existing = yield* query_rows(
                    CsvUpload,
                    sql`SELECT id,filename,row_count,status,updated_at::float8 AS updated_at,uploader_id,uploader_name,imports FROM csv_uploads WHERE id=${action.id}`
                )
                const serialized = action.rows.map((row) => JSON.stringify(row))
                if (
                    serialized.some((row) => row.length > 100000) ||
                    JSON.stringify(action.rows).length > 2000000
                )
                    return yield* Effect.fail(
                        denied("CSV upload exceeds the supported size")
                    )
                if (existing[0]) {
                    if (
                        existing[0].id !== action.id ||
                        existing[0].filename !== action.filename ||
                        existing[0].row_count !== action.rows.length ||
                        existing[0].status !== "completed"
                    )
                        return yield* Effect.fail(
                            denied("Select the original CSV to retry")
                        )
                    const rows = yield* load_upload_rows(principal, action.id)
                    if (
                        rows.rows.some(
                            (row) => row.data !== serialized[row.row_index]
                        )
                    )
                        return yield* Effect.fail(
                            denied(
                                "Selected CSV does not match the stored rows"
                            )
                        )
                } else {
                    const count = yield* query_rows(
                        Schema.Struct({ count: Schema.Number }),
                        sql`SELECT count(*)::int AS count FROM csv_uploads WHERE domain_id=${domain_id}`
                    )
                    if ((count[0]?.count ?? 0) >= 100)
                        return yield* Effect.fail(
                            denied("This workspace supports 100 CSV uploads")
                        )
                    yield* tx.query(
                        sql`INSERT INTO csv_uploads (id,domain_id,filename,uploader_id,uploader_name,row_count,status,created_at,updated_at) VALUES (${action.id},${domain_id},${action.filename},${principal.account_id},'Administrator',${action.rows.length},'completed',${now},${now})`
                    )
                    for (
                        let row_index = 0;
                        row_index < serialized.length;
                        row_index++
                    )
                        yield* tx.query(
                            sql`INSERT INTO csv_data (id,domain_id,upload_id,row_index,data,updated_at) VALUES (${randomUUID()},${domain_id},${action.id},${row_index},${serialized[row_index]},${now})`
                        )
                }
                changed_id = action.id
            } else if (action._tag === "DeleteCsv") {
                const upload = yield* query_rows(
                    CsvUpload,
                    sql`SELECT id,filename,row_count,status,updated_at::float8 AS updated_at,uploader_id,uploader_name,imports FROM csv_uploads WHERE domain_id=${domain_id} AND id=${action.id}`
                )
                if (!upload[0] || (upload[0].imports?.length ?? 0) > 0)
                    return yield* Effect.fail(
                        denied(
                            "Imported uploads are retained to preserve import history"
                        )
                    )
                yield* tx.query(
                    sql`DELETE FROM csv_uploads WHERE domain_id=${domain_id} AND id=${action.id}`
                )
                changed_id = action.id
            } else if (action._tag === "RecordContactImport") {
                const uploads = yield* query_rows(
                    CsvUpload,
                    sql`SELECT id,filename,row_count,status,updated_at::float8 AS updated_at,uploader_id,uploader_name,imports FROM csv_uploads WHERE domain_id=${domain_id} AND id=${action.upload_id} FOR UPDATE`
                )
                const upload = uploads[0]
                if (!upload || upload.status !== "completed")
                    return yield* Effect.fail(denied())
                const receipt = (yield* query_rows(
                    Schema.Struct({
                        imported: Schema.Number,
                        account_id: Schema.String,
                        completed_at: Schema.Number,
                    }),
                    sql`SELECT imported,account_id,completed_at::float8 AS completed_at FROM contact_import_receipts WHERE domain_id=${domain_id} AND source_id=${`postgres:${action.upload_id}`}`
                ))[0]
                if (
                    !receipt ||
                    receipt.account_id !== principal.account_id ||
                    receipt.imported < 0 ||
                    receipt.imported > upload.row_count
                )
                    return yield* Effect.fail(denied())
                if (
                    !(
                        upload.imports?.some(
                            (record) => record.destination_id === "contacts"
                        ) ?? false
                    )
                ) {
                    const imports = [
                        ...(upload.imports ?? []),
                        {
                            destination_id: "contacts",
                            destination_name: "Contacts",
                            actor_id: principal.account_id,
                            actor_name: "Administrator",
                            imported: receipt.imported,
                            rejected: 0,
                            skipped: upload.row_count - receipt.imported,
                            completed_at: receipt.completed_at,
                        },
                    ]
                    yield* tx.query(
                        sql`UPDATE csv_uploads SET imports=${JSON.stringify(imports)}::jsonb,updated_at=${now} WHERE id=${upload.id}`
                    )
                }
                changed_id = action.upload_id
            } else if (action._tag === "CreateTable") {
                yield* Effect.try({
                    try: () => validate_columns(action.columns),
                    catch: (error) => denied(String(error)),
                })
                const columns = JSON.stringify(action.columns)
                const existing = (yield* query_rows(
                    Schema.Struct({
                        id: Schema.String,
                        domain_id: Schema.String,
                        name: Schema.String,
                        columns: DataColumns,
                    }),
                    sql`SELECT id,domain_id,name,columns FROM data_tables WHERE id=${action.id}`
                ))[0]
                if (existing) {
                    if (
                        existing.domain_id !== domain_id ||
                        existing.name !== action.name ||
                        !same_columns(existing.columns, action.columns)
                    )
                        return yield* Effect.fail(denied())
                } else {
                    const same_name = yield* query_rows(
                        Id,
                        sql`SELECT id FROM data_tables WHERE domain_id=${domain_id} AND lower(name)=lower(${action.name}) LIMIT 1`
                    )
                    if (same_name[0])
                        return yield* Effect.fail(
                            denied("A table with this name already exists")
                        )
                    const count = yield* query_rows(
                        Schema.Struct({ count: Schema.Number }),
                        sql`SELECT count(*)::int AS count FROM data_tables WHERE domain_id=${domain_id}`
                    )
                    if ((count[0]?.count ?? 0) >= 100)
                        return yield* Effect.fail(
                            denied("This workspace supports 100 tables")
                        )
                    yield* tx.query(
                        sql`INSERT INTO data_tables (id,domain_id,name,columns,revision,row_count,created_at,updated_at) VALUES (${action.id},${domain_id},${action.name},${columns}::jsonb,1,0,${now},${now})`
                    )
                }
                changed_id = action.id
            } else {
                const tables = yield* query_rows(
                    TableDefinition,
                    sql`SELECT id,name,columns,revision,row_count FROM data_tables WHERE domain_id=${domain_id} AND id=${action.table_id} FOR UPDATE`
                )
                const table = tables[0]
                if (!table || table.revision !== action.schema_revision)
                    return yield* Effect.fail(
                        denied("The table changed; reload before saving")
                    )
                if (action._tag === "AppendRows") {
                    if (
                        action.row_ids.length !== action.rows.length ||
                        new Set(action.row_ids).size !== action.row_ids.length
                    )
                        return yield* Effect.fail(
                            denied("Import row IDs are invalid")
                        )
                    if (JSON.stringify(action.rows).length > 100000)
                        return yield* Effect.fail(
                            denied("Import exceeds the table limit")
                        )
                    const values = yield* Effect.try({
                        try: () =>
                            action.rows.map((row) =>
                                validate_row(table.columns, row)
                            ),
                        catch: (error) => denied(String(error)),
                    })
                    const existing_rows = yield* query_rows(
                        Schema.Struct({
                            id: Schema.String,
                            domain_id: Schema.String,
                            table_id: Schema.String,
                            values: RowValues,
                        }),
                        sql`SELECT id,domain_id,table_id,values FROM data_table_rows WHERE id IN (${sql.join(
                            action.row_ids.map((id) => sql`${id}`),
                            sql`,`
                        )})`
                    )
                    if (existing_rows.length > 0) {
                        if (
                            existing_rows.length !== action.row_ids.length ||
                            existing_rows.some((row) => {
                                const expected =
                                    values[action.row_ids.indexOf(row.id)]
                                return (
                                    expected === undefined ||
                                    row.domain_id !== domain_id ||
                                    row.table_id !== table.id ||
                                    !same_values(row.values, expected)
                                )
                            })
                        )
                            return yield* Effect.fail(
                                denied(
                                    "This import conflicts with existing rows"
                                )
                            )
                        if (action.upload_id !== undefined) {
                            const source = (yield* query_rows(
                                CsvUpload,
                                sql`SELECT id,filename,row_count,status,updated_at::float8 AS updated_at,uploader_id,uploader_name,imports FROM csv_uploads WHERE domain_id=${domain_id} AND id=${action.upload_id}`
                            ))[0]
                            if (
                                !source ||
                                !(
                                    source.imports?.some(
                                        (record) =>
                                            record.destination_id === table.id
                                    ) ?? false
                                )
                            )
                                return yield* Effect.fail(
                                    denied(
                                        "This import source does not match the saved rows"
                                    )
                                )
                        }
                        changed_id = table.id
                        return {
                            changed_id,
                            workspace: yield* load_workspace(principal),
                        }
                    }
                    if (table.row_count + action.rows.length > 1000)
                        return yield* Effect.fail(
                            denied("Import exceeds the table limit")
                        )
                    if (action.upload_id !== undefined) {
                        const uploads = yield* query_rows(
                            CsvUpload,
                            sql`SELECT id,filename,row_count,status,updated_at::float8 AS updated_at,uploader_id,uploader_name,imports FROM csv_uploads WHERE domain_id=${domain_id} AND id=${action.upload_id} FOR UPDATE`
                        )
                        const upload = uploads[0]
                        if (
                            !upload ||
                            upload.status !== "completed" ||
                            upload.row_count !== values.length ||
                            (upload.imports?.some(
                                (record) => record.destination_id === table.id
                            ) ??
                                false)
                        )
                            return yield* Effect.fail(
                                denied(
                                    "This CSV is incomplete or already imported into this table"
                                )
                            )
                        const imports = [
                            ...(upload.imports ?? []),
                            {
                                destination_id: table.id,
                                destination_name: table.name,
                                actor_id: principal.account_id,
                                actor_name: "Administrator",
                                imported: values.length,
                                rejected: 0,
                                skipped: 0,
                                completed_at: now,
                            },
                        ]
                        if (imports.length > 100)
                            return yield* Effect.fail(
                                denied(
                                    "This upload reached its 100-destination history limit"
                                )
                            )
                        yield* tx.query(
                            sql`UPDATE csv_uploads SET imports=${JSON.stringify(imports)}::jsonb,updated_at=${now} WHERE id=${upload.id}`
                        )
                    }
                    for (const [index, value] of values.entries()) {
                        yield* tx.query(
                            sql`INSERT INTO data_table_rows (id,domain_id,table_id,position,values,revision,created_at,updated_at) VALUES (${action.row_ids[index]},${domain_id},${table.id},${table.row_count + index},${JSON.stringify(value)}::jsonb,1,${now},${now})`
                        )
                    }
                    yield* tx.query(
                        sql`UPDATE data_tables SET row_count=row_count+${values.length},updated_at=${now} WHERE id=${table.id}`
                    )
                } else {
                    const rows = yield* query_rows(
                        TableRow,
                        sql`SELECT id,values,revision FROM data_table_rows WHERE domain_id=${domain_id} AND table_id=${table.id} AND id=${action.row_id} FOR UPDATE`
                    )
                    const row = rows[0]
                    if (!row || row.revision !== action.row_revision)
                        return yield* Effect.fail(
                            denied("This row changed; reload before saving")
                        )
                    const values = yield* Effect.try({
                        try: () => validate_row(table.columns, action.values),
                        catch: (error) => denied(String(error)),
                    })
                    yield* tx.query(
                        sql`UPDATE data_table_rows SET values=${JSON.stringify(values)}::jsonb,revision=revision+1,updated_at=${now} WHERE id=${row.id}`
                    )
                }
                changed_id = table.id
            }
            return { changed_id, workspace: yield* load_workspace(principal) }
        })
    )
})
const make = Effect.gen(function* () {
    const db = yield* Sql
    return {
        authorize: (
            principal: DataPrincipal,
            domain_id: string,
            write = false
        ) =>
            authorize(principal, domain_id, write).pipe(
                Effect.provideService(Sql, db)
            ),
        load_workspace: (principal: DataPrincipal) =>
            load_workspace(principal).pipe(Effect.provideService(Sql, db)),
        load_table_rows: (principal: DataPrincipal, id: string) =>
            load_table_rows(principal, id).pipe(Effect.provideService(Sql, db)),
        load_upload_rows: (principal: DataPrincipal, id: string) =>
            load_upload_rows(principal, id).pipe(
                Effect.provideService(Sql, db)
            ),
        change: (principal: DataPrincipal, action: DataAction) =>
            change(principal, action).pipe(Effect.provideService(Sql, db)),
    }
})
/**
 * Authorized reads and transactional writes for Data's workspace-owned records.
 * Mutation consistency and replay rules are enforced by {@link change}.
 */
export class DataRepository extends Context.Service<
    DataRepository,
    Effect.Success<typeof make>
>()("@urm/rpc/DataRepository") {}
/** Supplies {@link DataRepository} with the application's PostgreSQL connection. */
export const DataRepositoryLive = Layer.effect(DataRepository, make)
