// The one theme every code block on the site is highlighted with.
// createCssVariablesTheme emits `var(--shiki-*)` where a normal theme emits a
// literal colour, so a block takes its colours from whatever palette is on
// :root — all sixteen themes, not the light/dark pair a theme pair can express.
//
// The variables it names are mapped to palette tokens in styles/shiki.css.
// Astro's own "css-variables" preset is not used: it prefixes with
// `--astro-code-`, which would mean maintaining that mapping twice.
import { createCssVariablesTheme } from "shiki/core"

export const SHIKI_THEME_NAME = "css-variables"

export const shiki_theme = createCssVariablesTheme({
    name: SHIKI_THEME_NAME,
    variablePrefix: "--shiki-",
})
