import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { Theme } from "@urm/domain/schemas/settings"
import { AppFont } from "./appearance.model.ts"

export const ThemePreviewed = taggedStruct("ThemePreviewed", { theme: Theme })
export const ThemePreviewEnded = taggedStruct("ThemePreviewEnded")
export const ThemeSelected = taggedStruct("ThemeSelected", { theme: Theme })
export const ThemeApplied = taggedStruct("ThemeApplied", { theme: Theme })
export const ThemeSaved = taggedStruct("ThemeSaved", { theme: Theme })
export const ThemeSaveFailed = taggedStruct("ThemeSaveFailed", {
    error: S.String,
})

export const FontPreviewed = taggedStruct("FontPreviewed", { font: AppFont })
export const FontPreviewEnded = taggedStruct("FontPreviewEnded")
export const FontSelected = taggedStruct("FontSelected", { font: AppFont })
export const FontApplied = taggedStruct("FontApplied", {
    font: AppFont,
    codeFont: AppFont,
})

export const AppearancePreferencesLoaded = taggedStruct(
    "AppearancePreferencesLoaded",
    {
        theme: Theme,
        font: AppFont,
        codeFont: AppFont,
    }
)

export const ToggledThemeMenu = taggedStruct("ToggledThemeMenu", {
    isOpen: S.Boolean,
})
export const ToggledFontMenu = taggedStruct("ToggledFontMenu", {
    isOpen: S.Boolean,
})

// A pointerdown outside both menus. Closes them and drops any live preview:
// clicking away is a decision not to take the theme under the cursor.
export const DismissedMenus = taggedStruct("DismissedMenus")

// The settings page owns its own copy of the theme; this arrives when it saves
// so the header controls do not fall out of step with the page below them.
export const ThemeChangedElsewhere = taggedStruct("ThemeChangedElsewhere", {
    theme: Theme,
})

export const Message = S.Union([
    ThemePreviewed,
    ThemePreviewEnded,
    ThemeSelected,
    ThemeApplied,
    ThemeSaved,
    ThemeSaveFailed,
    FontPreviewed,
    FontPreviewEnded,
    FontSelected,
    FontApplied,
    AppearancePreferencesLoaded,
    ToggledThemeMenu,
    ToggledFontMenu,
    DismissedMenus,
    ThemeChangedElsewhere,
])

export type Message = typeof Message.Type
