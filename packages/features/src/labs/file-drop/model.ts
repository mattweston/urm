import * as Ui from "@foldkit/ui"
import { Schema as S } from "effect"
import { File } from "foldkit"

export const Model = S.Struct({
    fileDrop: Ui.FileDrop.Model,
    files: S.Array(File.File),
})

export type Model = typeof Model.Type
