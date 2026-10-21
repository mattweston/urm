import {
    DARK_THEMES,
    RESOLVED_THEMES,
    Theme,
} from "@urm/domain/schemas/settings"
import { Schema } from "effect"

declare const document: {
    readonly documentElement: {
        readonly classList: {
            add: (...tokens: Array<string>) => void
            remove: (...tokens: Array<string>) => void
        }
        setAttribute: (qualifiedName: string, value: string) => void
        readonly style: {
            setProperty: (property: string, value: string) => void
        }
    }
    cookie: string
}

export const themeCookieName = "theme"

const isTheme = Schema.is(Theme)

export const getThemeFromCookieHeader = (cookieHeader: string | null) => {
    if (cookieHeader === null) {
        return "light"
    }

    const match = cookieHeader.match(
        new RegExp(`(?:^|; )${themeCookieName}=([^;]*)`)
    )

    if (match === null) {
        return "light"
    }

    const cookieValue = match[1]

    if (cookieValue === undefined) {
        return "light"
    }

    const value = decodeURIComponent(cookieValue)

    return isTheme(value) ? value : "light"
}

// The cookie is written alongside every save, so in the browser it is the
// cheapest read of the persisted theme — no RPC round trip before first paint.
export const getThemeFromDocumentCookie = (): Theme =>
    typeof document === "undefined"
        ? "light"
        : getThemeFromCookieHeader(document.cookie)

export const themeClasses: ReadonlyArray<Theme> = RESOLVED_THEMES

type CriticalThemeColors = Readonly<{
    background: string
    foreground: string
    colorScheme: "light" | "dark"
}>

export const defaultCriticalThemeColors: CriticalThemeColors = {
    background: "oklch(1 0 0)",
    foreground: "oklch(0.145 0 0)",
    colorScheme: "light",
}

export const themeCriticalColors: Readonly<
    Partial<Record<Theme, CriticalThemeColors>>
> = {
    light: {
        background: "oklch(1 0 0)",
        foreground: "oklch(0.145 0 0)",
        colorScheme: "light",
    },
    dark: {
        background: "oklch(0.145 0 0)",
        foreground: "oklch(0.985 0 0)",
        colorScheme: "dark",
    },
    "catppuccin-latte": {
        background: "oklch(0.943 0.007 269.77)",
        foreground: "oklch(0.326 0.047 269.77)",
        colorScheme: "light",
    },
    "catppuccin-frappe": {
        background: "oklch(0.234 0.02 267.75)",
        foreground: "oklch(0.839 0.017 267.75)",
        colorScheme: "dark",
    },
    "catppuccin-macchiato": {
        background: "oklch(0.198 0.018 267.75)",
        foreground: "oklch(0.857 0.015 267.75)",
        colorScheme: "dark",
    },
    "catppuccin-mocha": {
        background: "oklch(0.145 0.019 267.75)",
        foreground: "oklch(0.871 0.014 267.75)",
        colorScheme: "dark",
    },
    "github-light": {
        background: "oklch(1 0 0)",
        foreground: "oklch(0.189 0.007 251.12)",
        colorScheme: "light",
    },
    "github-dark": {
        background: "oklch(0.075 0.007 251.12)",
        foreground: "oklch(0.967 0.002 251.12)",
        colorScheme: "dark",
    },
    nord: {
        background: "oklch(0.234 0.018 220.26)",
        foreground: "oklch(0.931 0.008 220.26)",
        colorScheme: "dark",
    },
    cartlane: {
        background: "#f6f2e9",
        foreground: "#20231f",
        colorScheme: "light",
    },
    dracula: {
        background: "#282a36",
        foreground: "#f8f8f2",
        colorScheme: "dark",
    },
    "tokyo-night": {
        background: "#1a1b26",
        foreground: "#c0caf5",
        colorScheme: "dark",
    },
    "one-dark": {
        background: "#282c34",
        foreground: "#abb2bf",
        colorScheme: "dark",
    },
    "solarized-light": {
        background: "#fdf6e3",
        foreground: "#657b83",
        colorScheme: "light",
    },
    "solarized-dark": {
        background: "#002b36",
        foreground: "#93a1a1",
        colorScheme: "dark",
    },
    "material-light": {
        background: "oklch(0.988 0.002 247.86)",
        foreground: "oklch(0.189 0.007 247.86)",
        colorScheme: "light",
    },
    brutalism: {
        background: "oklch(0.955 0.012 96)",
        foreground: "oklch(0.115 0.012 255)",
        colorScheme: "light",
    },
    "neo-brutalism": {
        background: "#fff7e9",
        foreground: "#241b2f",
        colorScheme: "light",
    },
    "neo-brutalism-dark": {
        background: "#241b2f",
        foreground: "#fff7e9",
        colorScheme: "dark",
    },
}

export const resolveTheme = (theme: Theme): Theme => theme

export const applyThemeToDocument = (theme: Theme) => {
    if (typeof document === "undefined") {
        return
    }

    const root = document.documentElement
    const resolvedTheme = resolveTheme(theme)
    const colorScheme = DARK_THEMES.includes(resolvedTheme) ? "dark" : "light"
    const criticalTheme = themeCriticalColors[resolvedTheme] ?? {
        background: colorScheme === "dark" ? "#151515" : "#ffffff",
        foreground: colorScheme === "dark" ? "#fafafa" : "#171717",
        colorScheme,
    }

    root.classList.remove(...themeClasses)
    root.classList.add(resolvedTheme)
    root.setAttribute("data-theme", resolvedTheme)
    root.style.setProperty("color-scheme", criticalTheme.colorScheme)
}

export const setThemeCookie = (theme: Theme) => {
    if (typeof document === "undefined") {
        return
    }

    document.cookie = `${themeCookieName}=${encodeURIComponent(theme)}; path=/; max-age=31536000`
}
