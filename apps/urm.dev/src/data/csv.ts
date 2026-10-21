import { Effect, Option, Schema as S } from "effect"
import { Command } from "foldkit"
import { ContactsApi } from "../contacts/api.ts"
import { load_upload_rows } from "./api.ts"
import { RawRow } from "@urm/domain/schemas/data-tables"
import * as Data from "@urm/features/data/submodel"
import * as CsvUpload from "@urm/features/data/upload-csv"

const Args = S.Struct({ domain_id: S.String, upload_id: S.String })
const ReadCsvPreview = Command.define("ReadCsvPreview", {
    args: Args.fields,
    messages: [Data.Message],
    execute: ({ domain_id, upload_id }) =>
        Effect.gen(function* () {
            const stored = yield* load_upload_rows(domain_id, upload_id)
            const rows = yield* Effect.forEach(stored.rows, (row) =>
                S.decodeUnknownEffect(S.fromJsonString(RawRow))(row.data).pipe(
                    Effect.map((values) => ({
                        id: row.id,
                        row_index: row.row_index,
                        values,
                    }))
                )
            )
            return Data.GotCsvUploadMessage({
                message: CsvUpload.LoadedUploadPreview({
                    domain_id,
                    upload_id,
                    rows,
                }),
            })
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(
                    Data.GotCsvUploadMessage({
                        message: CsvUpload.FailedUploadPreview({
                            domain_id,
                            upload_id,
                            error: String(error),
                        }),
                    })
                )
            )
        ),
})
export const translate_csv_preview = (
    active_domain_id: Option.Option<string>,
    command: Command.Command<Data.MessageType>
): ReadonlyArray<Command.Command<Data.MessageType, never, ContactsApi>> => {
    const args = S.decodeUnknownOption(Args)(command.args)
    if (
        Option.isNone(active_domain_id) ||
        Option.isNone(args) ||
        active_domain_id.value !== args.value.domain_id
    )
        return []
    return [
        ReadCsvPreview({
            domain_id: active_domain_id.value,
            upload_id: args.value.upload_id,
        }),
    ]
}
