import {
    PublishedSiteTheme,
    type SiteThemeTokens,
} from "@urm/domain/schemas/site-appearance"
import { Schema } from "effect"

const declarations = (tokens: SiteThemeTokens): string => `
    --site-background: ${tokens.background};
    --site-foreground: ${tokens.foreground};
    --site-muted: ${tokens.muted_foreground};
    --site-border: ${tokens.border};
    --site-primary: ${tokens.primary};
    --background: ${tokens.background};
    --foreground: ${tokens.foreground};
    --card: ${tokens.card ?? tokens.background};
    --card-foreground: ${tokens.card_foreground ?? tokens.foreground};
    --popover: ${tokens.popover ?? tokens.background};
    --popover-foreground: ${tokens.popover_foreground ?? tokens.foreground};
    --primary: ${tokens.primary};
    --primary-foreground: ${tokens.primary_foreground ?? tokens.background};
    --secondary: ${tokens.secondary ?? tokens.border};
    --secondary-foreground: ${tokens.secondary_foreground ?? tokens.foreground};
    --muted: ${tokens.muted ?? tokens.border};
    --muted-foreground: ${tokens.muted_foreground};
    --accent: ${tokens.accent ?? tokens.primary};
    --accent-foreground: ${tokens.accent_foreground ?? tokens.background};
    --destructive: ${tokens.destructive ?? tokens.primary};
    --destructive-foreground: ${tokens.destructive_foreground ?? tokens.background};
    --success: ${tokens.success ?? tokens.primary};
    --success-foreground: ${tokens.success_foreground ?? tokens.background};
    --warning: ${tokens.warning ?? tokens.primary};
    --warning-foreground: ${tokens.warning_foreground ?? tokens.foreground};
    --border: ${tokens.border};
    --input: ${tokens.input ?? tokens.border};
    --ring: ${tokens.ring ?? tokens.primary};
    --chart-1: ${tokens.chart_1 ?? tokens.primary};
    --chart-2: ${tokens.chart_2 ?? tokens.primary};
    --chart-3: ${tokens.chart_3 ?? tokens.primary};
    --chart-4: ${tokens.chart_4 ?? tokens.primary};
    --chart-5: ${tokens.chart_5 ?? tokens.primary};
    --site-font-body: ${tokens.font_body};
    --site-font-code: ${tokens.font_code};
    --site-radius: ${tokens.radius};`

export const renderSiteThemeCss = (
    theme: PublishedSiteTheme | undefined
): string => {
    if (theme === undefined) return ""
    // Validate even when called outside the decoded publishing runner.
    const value = Schema.decodeUnknownSync(PublishedSiteTheme)(theme)
    const initial = value.appearance === "dark" ? value.dark : value.light
    return `\n:root {\n    color-scheme: ${value.appearance === "system" ? "light dark" : value.appearance};${declarations(initial)}\n}\n${value.appearance === "system" ? `@media (prefers-color-scheme: dark) {\n    :root {${declarations(value.dark)}\n    }\n}\n` : ""}`
}
