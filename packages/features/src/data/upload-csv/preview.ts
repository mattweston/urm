import { Schema as S } from "effect"
import { RawRow } from "@urm/domain/schemas/data-tables"

export const PreviewRow = S.Struct({
    id: S.String,
    row_index: S.Number,
    values: RawRow,
})
