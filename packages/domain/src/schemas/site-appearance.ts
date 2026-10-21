import { Schema } from "effect"
import {
    DEFAULT_THEME_FAMILY,
    THEME_FAMILIES,
    ThemeFamilyId,
} from "./settings.ts"
import { site_theme_tokens } from "../site-theme-tokens.generated.ts"

export const SiteAppearance = Schema.Literals(["system", "light", "dark"])
export type SiteAppearance = typeof SiteAppearance.Type

export const SiteAppearanceSettings = Schema.Struct({
    theme_id: ThemeFamilyId,
    appearance: SiteAppearance,
})
export type SiteAppearanceSettings = typeof SiteAppearanceSettings.Type

// Values, not arbitrary CSS: no selectors, declarations, URLs or markup.
const Color = Schema.String.check(
    Schema.isPattern(
        /^(#[\da-fA-F]{3,8}|(?:oklch|rgb|rgba|hsl|hsla)\([\d.%, /+-]+\))$/
    )
)
const Font = Schema.String.check(
    Schema.isMaxLength(200),
    Schema.isPattern(/^[\w\s,'"-]+$/)
)
/**
 * Restricted CSS values carried in a published theme. Patterns exclude full
 * declarations, URLs and markup; they are not a complete CSS syntax validator.
 * Keep these checks when introducing new generated palette formats.
 */
export const SiteThemeTokens = Schema.Struct({
    background: Color,
    foreground: Color,
    card: Schema.optional(Color),
    card_foreground: Schema.optional(Color),
    popover: Schema.optional(Color),
    popover_foreground: Schema.optional(Color),
    primary_foreground: Schema.optional(Color),
    secondary: Schema.optional(Color),
    secondary_foreground: Schema.optional(Color),
    muted: Schema.optional(Color),
    muted_foreground: Color,
    accent: Schema.optional(Color),
    accent_foreground: Schema.optional(Color),
    destructive: Schema.optional(Color),
    destructive_foreground: Schema.optional(Color),
    success: Schema.optional(Color),
    success_foreground: Schema.optional(Color),
    warning: Schema.optional(Color),
    warning_foreground: Schema.optional(Color),
    border: Color,
    input: Schema.optional(Color),
    ring: Schema.optional(Color),
    primary: Color,
    chart_1: Schema.optional(Color),
    chart_2: Schema.optional(Color),
    chart_3: Schema.optional(Color),
    chart_4: Schema.optional(Color),
    chart_5: Schema.optional(Color),
    font_body: Font,
    font_code: Font,
    radius: Schema.String.check(
        Schema.isPattern(/^\d+(?:\.\d+)?(?:rem|px|em)$/)
    ),
})
export type SiteThemeTokens = typeof SiteThemeTokens.Type

/**
 * Site appearance selection bundled with both resolved palettes. Carries the
 * token values needed by a release rather than requiring consumers to look up
 * the current theme catalog. appearance may remain system; both modes are kept.
 */
export const PublishedSiteTheme = Schema.Struct({
    ...SiteAppearanceSettings.fields,
    light: SiteThemeTokens,
    dark: SiteThemeTokens,
})
export type PublishedSiteTheme = typeof PublishedSiteTheme.Type

/**
 * Builds a published theme from generated palette tokens, retaining the chosen
 * appearance and both modes. Synchronously decodes the assembled result, so
 * missing or invalid generated tokens throw a schema error.
 *
 * A missing catalog family uses the default palettes but does not rewrite
 * settings.theme_id; the final decode still rejects an invalid family ID.
 */
export const resolveSiteTheme = (
    settings: SiteAppearanceSettings
): PublishedSiteTheme => {
    const family =
        THEME_FAMILIES.find((item) => item.id === settings.theme_id) ??
        DEFAULT_THEME_FAMILY
    const palettes: Readonly<Record<string, unknown>> = site_theme_tokens
    return Schema.decodeUnknownSync(PublishedSiteTheme)({
        ...settings,
        light: palettes[family.light],
        dark: palettes[family.dark],
    })
}
