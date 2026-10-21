import { Schema as S } from "effect"
import * as CsvUpload from "./upload-csv/index.ts"

import * as Tables from "./tables/model.ts"

export const Route = S.Literals(["Home", "Csv", "Spreadsheets"])
export type Route = typeof Route.Type

export const Model = S.Struct({
    route: Route,
    csv_import_open: S.Boolean,
    tables: Tables.Model,
    csvUpload: CsvUpload.Model,
})
export type Model = typeof Model.Type
