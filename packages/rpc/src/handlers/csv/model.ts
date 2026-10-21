/**
 * # CSV Model
 *
 * Pairs Drizzle tables with Effect schemas
 *
 * Re-exports schemas from @urm/shared (source of truth)
 * and tables from db/schema (database structure).
 *
 * This file is the "model aggregator" for the CSV feature:
 * - Drizzle tables: csv_uploads, csv_data
 * - Effect schemas: CsvUpload, CsvData, CreateCsvUploadInput, CreateCsvDataInput
 * - Error types: NotFoundError, DatabaseError, ConflictError
 */

import {
    CsvUpload,
    CsvData,
    CreateCsvUploadInput,
    UpdateCsvUploadInput,
    CreateCsvDataInput,
    UpdateCsvDataInput,
    CreateCsvUploadRequest,
    CreateCsvDataRequest,
    NotFoundError,
    DatabaseError,
    ConflictError,
} from "@urm/domain/schemas/csv"

// Re-export Drizzle tables and inferred types
export { csv_uploads, csv_data } from "@urm/db/legacy-schema/csv"
export type {
    CsvUpload as CsvUploadRow,
    NewCsvUpload,
    CsvData as CsvDataRow,
    NewCsvData,
} from "@urm/db/legacy-schema/csv"

// Re-export Effect schemas (used in routes and handlers)
export {
    CsvUpload,
    CsvData,
    CreateCsvUploadInput,
    UpdateCsvUploadInput,
    CreateCsvDataInput,
    UpdateCsvDataInput,
    CreateCsvUploadRequest,
    CreateCsvDataRequest,
    NotFoundError,
    DatabaseError,
    ConflictError,
}

export const CsvUploadsModel = {
    insert: CreateCsvUploadInput,
    update: UpdateCsvUploadInput,
    select: CsvUpload,
}

export const CsvDataModel = {
    insert: CreateCsvDataInput,
    update: UpdateCsvDataInput,
    select: CsvData,
}
