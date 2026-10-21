import {
    applyThemeToDocument,
    getThemeFromDocumentCookie,
} from "../theme/theme.runtime.ts"
import {
    applyFontToDocument,
    readStoredCodeFont,
    readStoredFont,
} from "./appearance.runtime.ts"

// Runs before the Foldkit runtime starts. Without it the app paints in the
// default theme and swaps once the settings page happens to load preferences,
// which is a visible flash on every route that is not /settings/theme.
export const bootstrap = (): void => {
    applyThemeToDocument(getThemeFromDocumentCookie())
    applyFontToDocument(readStoredFont(), readStoredCodeFont())
}
