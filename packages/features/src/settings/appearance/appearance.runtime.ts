import { Option, Schema as S } from "effect"
import { AppFont } from "./appearance.model.ts"

export type FontMode = "sans" | "mono"

// "theme" sits in the sans list because the shipped theme bodies are sans —
// picking it is how you get back to the theme's own typography.
export const SANS_FONTS: ReadonlyArray<AppFont> = ["theme", "inter", "atkinson"]

export const MONO_FONTS: ReadonlyArray<AppFont> = [
    "geist-mono",
    "jetbrains-mono",
    "commit-mono",
    "fira-code",
    "0xproto",
]

export const FONT_LABELS: Readonly<Record<AppFont, string>> = {
    theme: "Theme default",
    inter: "Inter",
    atkinson: "Atkinson Hyperlegible",
    "geist-mono": "Geist Mono",
    "jetbrains-mono": "JetBrains Mono",
    "commit-mono": "Commit Mono",
    "fira-code": "Fira Code",
    "0xproto": "0xProto",
}

export const isMonoFont = (font: AppFont): boolean => MONO_FONTS.includes(font)

export const fontModeFor = (font: AppFont): FontMode =>
    isMonoFont(font) ? "mono" : "sans"

// A mono pick drives the code font too, so prose and code stay in one family
// unless the reader deliberately mixes them.
export const codeFontFor = (font: AppFont, currentCodeFont: AppFont): AppFont =>
    isMonoFont(font) ? font : currentCodeFont

export const fontStorageKey = "urm.web.font"
export const codeFontStorageKey = "urm.web.code-font"

const decodeFont = S.decodeUnknownOption(AppFont)

const readStored = (key: string): Option.Option<AppFont> => {
    try {
        return decodeFont(globalThis.localStorage?.getItem(key))
    } catch {
        return Option.none()
    }
}

export const readStoredFont = (): AppFont =>
    Option.getOrElse(readStored(fontStorageKey), (): AppFont => "theme")

export const readStoredCodeFont = (): AppFont => {
    const stored = Option.getOrElse(
        readStored(codeFontStorageKey),
        (): AppFont => "theme"
    )

    return isMonoFont(stored) ? stored : "theme"
}

export const storeFont = (font: AppFont, codeFont: AppFont): void => {
    try {
        globalThis.localStorage?.setItem(fontStorageKey, font)
        globalThis.localStorage?.setItem(codeFontStorageKey, codeFont)
    } catch {
        // A blocked storage partition is not worth failing a font change over.
    }
}

export const applyFontToDocument = (font: AppFont, codeFont: AppFont): void => {
    if (typeof document === "undefined") {
        return
    }

    const root = document.documentElement

    if (font === "theme") {
        root.removeAttribute("data-font")
    } else {
        root.setAttribute("data-font", font)
    }

    if (codeFont === "theme") {
        root.removeAttribute("data-code-font")
    } else {
        root.setAttribute("data-code-font", codeFont)
    }
}
