import { Schema } from "effect"

export const CsvUploadStatus = Schema.Literals([
    "pending",
    "processing",
    "completed",
    "failed",
])
export type CsvUploadStatus = typeof CsvUploadStatus.Type

export const CsvImportRecord = Schema.Struct({
    destination_id: Schema.String,
    destination_name: Schema.String,
    actor_id: Schema.String,
    actor_name: Schema.optional(Schema.String),
    imported: Schema.Number,
    rejected: Schema.Number,
    skipped: Schema.Number,
    completed_at: Schema.Number,
})
export const CsvUpload = Schema.Struct({
    id: Schema.String,
    filename: Schema.String,
    row_count: Schema.Number,
    status: CsvUploadStatus,
    updated_at: Schema.Number,
    uploader_id: Schema.optional(Schema.String),
    uploader_name: Schema.optional(Schema.String),
    imports: Schema.optional(Schema.Array(CsvImportRecord)),
})
export type CsvUpload = typeof CsvUpload.Type

export const CsvData = Schema.Struct({
    id: Schema.String,
    upload_id: Schema.String,
    row_index: Schema.Number,
    data: Schema.String, // JSON string
    updated_at: Schema.Number,
})

export type CsvData = Schema.Schema.Type<typeof CsvData>

export const CreateCsvUploadInput = Schema.Struct({
    id: Schema.String,
    filename: Schema.String,
    row_count: Schema.Number,
    status: CsvUploadStatus,
    updated_at: Schema.Number,
})

export type CreateCsvUploadInput = Schema.Schema.Type<
    typeof CreateCsvUploadInput
>

export const UpdateCsvUploadInput = Schema.Struct({
    id: Schema.String,
    filename: Schema.optional(Schema.String),
    row_count: Schema.optional(Schema.Number),
    status: Schema.optional(CsvUploadStatus),
    updated_at: Schema.Number,
})

export type UpdateCsvUploadInput = Schema.Schema.Type<
    typeof UpdateCsvUploadInput
>

export const CreateCsvDataInput = Schema.Struct({
    id: Schema.String,
    upload_id: Schema.String,
    row_index: Schema.Number,
    data: Schema.String,
    updated_at: Schema.Number,
})

export type CreateCsvDataInput = Schema.Schema.Type<typeof CreateCsvDataInput>

export const UpdateCsvDataInput = Schema.Struct({
    id: Schema.String,
    upload_id: Schema.optional(Schema.String),
    row_index: Schema.optional(Schema.Number),
    data: Schema.optional(Schema.String),
    updated_at: Schema.Number,
})

export type UpdateCsvDataInput = Schema.Schema.Type<typeof UpdateCsvDataInput>

export const CreateCsvUploadRequest = Schema.Struct({
    filename: Schema.String,
    row_count: Schema.Number,
    status: CsvUploadStatus,
    updated_at: Schema.Number,
})

export type CreateCsvUploadRequest = Schema.Schema.Type<
    typeof CreateCsvUploadRequest
>

export const CreateCsvDataRequest = Schema.Struct({
    upload_id: Schema.String,
    row_index: Schema.Number,
    data: Schema.String,
    updated_at: Schema.Number,
})

export type CreateCsvDataRequest = Schema.Schema.Type<
    typeof CreateCsvDataRequest
>

export { ConflictError, DatabaseError, NotFoundError } from "../errors.ts"
