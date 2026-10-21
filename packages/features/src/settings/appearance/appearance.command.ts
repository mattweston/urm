import { Effect } from "effect"
import { Command } from "foldkit"
import { Theme } from "@urm/domain/schemas/settings"
import { applyThemeToDocument, setThemeCookie } from "../theme/theme.runtime.ts"
import { AppFont } from "./appearance.model.ts"
import { applyFontToDocument, storeFont } from "./appearance.runtime.ts"
import {
    FontApplied,
    ThemeApplied,
    ThemeSaveFailed,
    ThemeSaved,
} from "./appearance.message.ts"

export const ApplyAppearanceTheme = Command.define("ApplyAppearanceTheme", {
    args: { theme: Theme },
    messages: [ThemeApplied],
    execute: ({ theme }) =>
        Effect.sync(() => {
            applyThemeToDocument(theme)
            return ThemeApplied({ theme })
        }),
})

export const SaveAppearanceTheme = Command.define("SaveAppearanceTheme", {
    args: { theme: Theme },
    messages: [ThemeSaved, ThemeSaveFailed],
    execute: () =>
        Effect.succeed(
            ThemeSaveFailed({
                error: "No appearance persistence adapter installed",
            })
        ),
})

export const SaveAppearanceThemeDeviceCache = Command.define(
    "SaveAppearanceThemeDeviceCache",
    {
        args: { theme: Theme },
        messages: [ThemeSaved],
        execute: ({ theme }) =>
            Effect.sync(() => {
                setThemeCookie(theme)
                return ThemeSaved({ theme })
            }),
    }
)

export const ApplyAppearanceFont = Command.define("ApplyAppearanceFont", {
    args: { font: AppFont, codeFont: AppFont },
    messages: [FontApplied],
    execute: ({ font, codeFont }) =>
        Effect.sync(() => {
            applyFontToDocument(font, codeFont)
            return FontApplied({ font, codeFont })
        }),
})

export const SaveAppearanceFont = Command.define("SaveAppearanceFont", {
    args: { font: AppFont, codeFont: AppFont },
    messages: [FontApplied],
    execute: ({ font, codeFont }) =>
        Effect.sync(() => {
            storeFont(font, codeFont)
            applyFontToDocument(font, codeFont)
            return FontApplied({ font, codeFont })
        }),
})
