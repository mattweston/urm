import { Schema as S } from "effect"
import { AppFont, Theme } from "@urm/domain/schemas/settings"

export { AppFont } from "@urm/domain/schemas/settings"

export const Model = S.Struct({
    // theme/font/codeFont are what the document currently shows, which during a
    // hover preview is not what was committed. saved* is the value a preview
    // reverts to when the pointer leaves.
    theme: Theme,
    savedTheme: Theme,
    font: AppFont,
    savedFont: AppFont,
    codeFont: AppFont,
    savedCodeFont: AppFont,
    isSavingTheme: S.Boolean,
    isThemeMenuOpen: S.Boolean,
    isFontMenuOpen: S.Boolean,
})

export type Model = typeof Model.Type
