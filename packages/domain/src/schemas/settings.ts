import * as Schema from "effect/Schema"

/**
 * Bare Spotify playlist identifier. Pass the ID extracted from a URL or URI,
 * not the full link; surrounding whitespace is rejected rather than trimmed.
 */
export const SpotifyPlaylistId = Schema.Trimmed.check(
    Schema.isPattern(/^[A-Za-z0-9]{22}$/)
).pipe(Schema.brand("SpotifyPlaylistId"))
export type SpotifyPlaylistId = typeof SpotifyPlaylistId.Type

export const DEFAULT_SPOTIFY_PLAYLIST_ID = Schema.decodeUnknownSync(
    SpotifyPlaylistId
)("6cLVRosXIz2b7mA7smCfKf")

export const RESOLVED_THEMES = [
    "light",
    "dark",
    "cartlane",
    "cartlane-dark",
    "brutalism",
    "brutalism-dark",
    "neo-brutalism",
    "neo-brutalism-dark",
    "catppuccin-latte",
    "catppuccin-latte-dark",
    "catppuccin-frappe-light",
    "catppuccin-frappe",
    "catppuccin-macchiato-light",
    "catppuccin-macchiato",
    "catppuccin-mocha-light",
    "catppuccin-mocha",
    "github-light",
    "github-dark",
    "nord-light",
    "nord",
    "dracula-light",
    "dracula",
    "tokyo-night-light",
    "tokyo-night",
    "one-light",
    "one-dark",
    "solarized-light",
    "solarized-dark",
    "material-light",
    "material-dark",
    "stone-light",
    "stone",
]

export const Theme = Schema.Literals(RESOLVED_THEMES)
export type Theme = typeof Theme.Type

export const ThemeMode = Schema.Literals(["light", "dark"])
export type ThemeMode = typeof ThemeMode.Type

export const AppFont = Schema.Literals([
    "theme",
    "inter",
    "atkinson",
    "geist-mono",
    "jetbrains-mono",
    "commit-mono",
    "fira-code",
    "0xproto",
])
export type AppFont = typeof AppFont.Type

/**
 * Theme family selection independent of light/dark mode. Theme identifies a
 * resolved palette instead: the nord family selects nord-light or nord.
 */
export const ThemeFamilyId = Schema.Literals([
    "default",
    "cartlane",
    "brutalism",
    "neo-brutalism",
    "catppuccin-latte",
    "catppuccin-frappe",
    "catppuccin-macchiato",
    "catppuccin-mocha",
    "github",
    "nord",
    "dracula",
    "tokyo-night",
    "one",
    "solarized",
    "material",
    "stone",
])
export type ThemeFamilyId = typeof ThemeFamilyId.Type

export type ThemeFamily = Readonly<{
    id: ThemeFamilyId
    label: string
    description: string
    light: Theme
    dark: Theme
    light_colors: ReadonlyArray<string>
    dark_colors: ReadonlyArray<string>
}>

export const DEFAULT_THEME_FAMILY: ThemeFamily = {
    id: "default",
    label: "Default",
    description: "Neutral and direct",
    light: "light",
    dark: "dark",
    light_colors: ["#ffffff", "#111827", "#2563eb"],
    dark_colors: ["#09090b", "#fafafa", "#60a5fa"],
}

export const THEME_FAMILIES: ReadonlyArray<ThemeFamily> = [
    DEFAULT_THEME_FAMILY,
    {
        id: "cartlane",
        label: "Cartlane",
        description: "Warm commerce green",
        light: "cartlane",
        dark: "cartlane-dark",
        light_colors: ["#f6f2e9", "#20231f", "#304a3d"],
        dark_colors: ["#171b18", "#f2eee5", "#86a88f"],
    },
    {
        id: "brutalism",
        label: "Brutalism",
        description: "Ink, paper and safety yellow",
        light: "brutalism",
        dark: "brutalism-dark",
        light_colors: ["#f5f0dc", "#171719", "#f4d400"],
        dark_colors: ["#151519", "#fff9df", "#ffe033"],
    },
    {
        id: "neo-brutalism",
        label: "Neo-Brutalism",
        description: "Rounded ink and candy pop",
        light: "neo-brutalism",
        dark: "neo-brutalism-dark",
        light_colors: ["#fff7e9", "#241b2f", "#ff694f"],
        dark_colors: ["#241b2f", "#fff7e9", "#ff8f7a"],
    },
    {
        id: "catppuccin-latte",
        label: "Catppuccin Latte",
        description: "Lavender pastel",
        light: "catppuccin-latte",
        dark: "catppuccin-latte-dark",
        light_colors: ["#eff1f5", "#4c4f69", "#8839ef"],
        dark_colors: ["#24243a", "#dce0f5", "#c6a0f6"],
    },
    {
        id: "catppuccin-frappe",
        label: "Catppuccin Frappé",
        description: "Cool muted pastel",
        light: "catppuccin-frappe-light",
        dark: "catppuccin-frappe",
        light_colors: ["#e9eaf2", "#414559", "#7287fd"],
        dark_colors: ["#232634", "#c6d0f5", "#ca9ee6"],
    },
    {
        id: "catppuccin-macchiato",
        label: "Catppuccin Macchiato",
        description: "Blue lavender pastel",
        light: "catppuccin-macchiato-light",
        dark: "catppuccin-macchiato",
        light_colors: ["#eceef5", "#363a4f", "#8aadf4"],
        dark_colors: ["#1e2030", "#cad3f5", "#c6a0f6"],
    },
    {
        id: "catppuccin-mocha",
        label: "Catppuccin Mocha",
        description: "Deep warm pastel",
        light: "catppuccin-mocha-light",
        dark: "catppuccin-mocha",
        light_colors: ["#f0eef4", "#313244", "#8839ef"],
        dark_colors: ["#11111b", "#cdd6f4", "#cba6f7"],
    },
    {
        id: "github",
        label: "GitHub",
        description: "GitHub interface colors",
        light: "github-light",
        dark: "github-dark",
        light_colors: ["#ffffff", "#24292f", "#0969da"],
        dark_colors: ["#010409", "#f0f6fc", "#58a6ff"],
    },
    {
        id: "nord",
        label: "Nord",
        description: "Arctic blue-grey",
        light: "nord-light",
        dark: "nord",
        light_colors: ["#eceff4", "#2e3440", "#5e81ac"],
        dark_colors: ["#2e3440", "#eceff4", "#81a1c1"],
    },
    {
        id: "dracula",
        label: "Dracula",
        description: "Vivid purple and pink",
        light: "dracula-light",
        dark: "dracula",
        light_colors: ["#f8f8f2", "#282a36", "#7c3aed"],
        dark_colors: ["#282a36", "#f8f8f2", "#bd93f9"],
    },
    {
        id: "tokyo-night",
        label: "Tokyo Night",
        description: "Electric city blue",
        light: "tokyo-night-light",
        dark: "tokyo-night",
        light_colors: ["#e6e7ed", "#343b58", "#34548a"],
        dark_colors: ["#1a1b26", "#c0caf5", "#7aa2f7"],
    },
    {
        id: "one",
        label: "One",
        description: "Atom-inspired syntax colors",
        light: "one-light",
        dark: "one-dark",
        light_colors: ["#fafafa", "#383a42", "#4078f2"],
        dark_colors: ["#282c34", "#abb2bf", "#61afef"],
    },
    {
        id: "solarized",
        label: "Solarized",
        description: "Precision colors",
        light: "solarized-light",
        dark: "solarized-dark",
        light_colors: ["#fdf6e3", "#657b83", "#268bd2"],
        dark_colors: ["#002b36", "#839496", "#268bd2"],
    },
    {
        id: "material",
        label: "Material",
        description: "Material Design blue",
        light: "material-light",
        dark: "material-dark",
        light_colors: ["#ffffff", "#212121", "#1976d2"],
        dark_colors: ["#121212", "#f5f5f5", "#90caf9"],
    },
    {
        id: "stone",
        label: "Stone",
        description: "Warm neutral and burnt orange",
        light: "stone-light",
        dark: "stone",
        light_colors: ["#f5f5f4", "#1c1917", "#c2410c"],
        dark_colors: ["#1c1917", "#f5f5f4", "#f97316"],
    },
]

/**
 * Finds the family containing a resolved palette in either mode. Falls back
 * to DEFAULT_THEME_FAMILY when no catalog entry matches; callers decoding
 * unknown input should validate Theme before using this lookup.
 */
export const themeFamilyFor = (theme: Theme): ThemeFamily =>
    THEME_FAMILIES.find(
        (family) => family.light === theme || family.dark === theme
    ) ?? DEFAULT_THEME_FAMILY

/**
 * Determines mode from the family catalog, not the palette's name. A palette
 * such as nord is dark despite lacking a -dark suffix. An unmatched palette
 * falls through the default family lookup and resolves to light.
 */
export const themeModeFor = (theme: Theme): ThemeMode =>
    themeFamilyFor(theme).dark === theme ? "dark" : "light"

export const resolveTheme = (family: ThemeFamily, mode: ThemeMode): Theme =>
    mode === "dark" ? family.dark : family.light

export const DARK_THEMES: ReadonlyArray<Theme> = THEME_FAMILIES.map(
    (family) => family.dark
)

export const MarketingFontPreset = Schema.Literals([
    "Theme",
    "Geist",
    "System",
    "SystemSerif",
])

export type MarketingFontPreset = Schema.Schema.Type<typeof MarketingFontPreset>

export const Preference = Schema.Struct({
    id: Schema.String,
    contact_id: Schema.String,
    theme: Theme,
    language: Schema.String,
    notifications: Schema.Boolean,
    updated_at: Schema.Number,
})

export type Preference = Schema.Schema.Type<typeof Preference>

export const MarketingAppearance = Schema.Struct({
    id: Schema.String,
    theme: Theme,
    font_preset: MarketingFontPreset,
    background_image_id: Schema.NullOr(Schema.String),
    updated_at: Schema.Number,
})

export type MarketingAppearance = Schema.Schema.Type<typeof MarketingAppearance>

export const CreatePreferenceInput = Schema.Struct({
    id: Schema.String,
    contact_id: Schema.String,
    theme: Schema.optional(Theme),
    language: Schema.optional(Schema.String),
    notifications: Schema.optional(Schema.Boolean),
    updated_at: Schema.Number,
})

export type CreatePreferenceInput = Schema.Schema.Type<
    typeof CreatePreferenceInput
>

export const UpdatePreferenceInput = Schema.Struct({
    id: Schema.String,
    theme: Schema.optional(Theme),
    language: Schema.optional(Schema.String),
    notifications: Schema.optional(Schema.Boolean),
    updated_at: Schema.Number,
})

export type UpdatePreferenceInput = Schema.Schema.Type<
    typeof UpdatePreferenceInput
>

export const UpdateMarketingAppearanceInput = Schema.Struct({
    theme: Theme,
    font_preset: MarketingFontPreset,
    background_image_id: Schema.NullOr(Schema.String),
})

export type UpdateMarketingAppearanceInput = Schema.Schema.Type<
    typeof UpdateMarketingAppearanceInput
>

export { ConflictError, DatabaseError, NotFoundError } from "../errors.ts"
