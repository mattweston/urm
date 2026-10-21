import { Array } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import {
    THEME_FAMILIES,
    resolveTheme,
    themeFamilyFor,
    themeModeFor,
    type Theme,
    type ThemeFamily,
    type ThemeMode,
} from "@urm/domain/schemas/settings"

export type ThemeHandlers<ParentMessage> = Readonly<{
    onPreview: (theme: Theme) => ParentMessage
    onEndPreview: ParentMessage
    onSelect: (theme: Theme) => ParentMessage
}>

export const swatch = <ParentMessage>(
    color: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "h-4 w-4 rounded-full border-(length:--surface-border-width) border-border/50"
            ),
            h.Style({ backgroundColor: color }),
        ],
        []
    )

const familyButton = <ParentMessage>(
    selectedTheme: Theme,
    family: ThemeFamily,
    mode: ThemeMode,
    handlers: ThemeHandlers<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const isSelected = themeFamilyFor(selectedTheme).id === family.id
    const colors = mode === "dark" ? family.dark_colors : family.light_colors
    const theme = resolveTheme(family, mode)

    // No per-cell border and no gap: the cells butt up against each other and
    // the grid's own rounded border is the only outline in the block.
    return h.keyed("button")(
        family.id,
        [
            h.Type("button"),
            h.OnMouseEnter(handlers.onPreview(theme)),
            h.OnFocus(handlers.onPreview(theme)),
            h.OnBlur(handlers.onEndPreview),
            h.OnClick(handlers.onSelect(theme)),
            h.Class(
                `cursor-pointer p-3 text-left transition-colors ${
                    isSelected
                        ? "bg-[color-mix(in_oklab,var(--primary)_10%,var(--card))]"
                        : "bg-card hover:bg-[color-mix(in_oklab,var(--accent)_50%,var(--card))]"
                }`
            ),
        ],
        [
            h.div(
                [h.Class("flex items-center justify-between gap-4")],
                [
                    h.div(
                        [h.Class("min-w-0 flex-1")],
                        [
                            h.div(
                                [h.Class("font-medium text-card-foreground")],
                                [family.label]
                            ),
                            h.div(
                                [h.Class("text-sm text-muted-foreground")],
                                [family.description]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("flex gap-1")],
                        Array.map(colors, (color) => swatch(color, h))
                    ),
                ]
            ),
        ]
    )
}

const modeButton = <ParentMessage>(
    selectedTheme: Theme,
    mode: ThemeMode,
    handlers: ThemeHandlers<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const family = themeFamilyFor(selectedTheme)
    const isSelected = themeModeFor(selectedTheme) === mode

    return h.button(
        [
            h.Type("button"),
            h.AriaPressed(String(isSelected)),
            h.OnClick(handlers.onSelect(resolveTheme(family, mode))),
            h.Class(
                isSelected
                    ? "cursor-pointer rounded-[var(--radius-control)] bg-background px-4 py-2 text-sm font-semibold text-foreground [box-shadow:var(--shadow-control)]"
                    : "cursor-pointer rounded-[var(--radius-control)] px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground [box-shadow:var(--shadow-control)]"
            ),
        ],
        [mode === "light" ? "Light" : "Dark"]
    )
}

export const modeToggleView = <ParentMessage>(
    selectedTheme: Theme,
    handlers: ThemeHandlers<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "grid grid-cols-2 gap-1 rounded-[var(--radius-surface)] bg-muted p-1"
            ),
            h.Role("group"),
            h.AriaLabel("Theme variant"),
        ],
        [
            modeButton(selectedTheme, "light", handlers, h),
            modeButton(selectedTheme, "dark", handlers, h),
        ]
    )

export const themeGridView = <ParentMessage>(
    selectedTheme: Theme,
    handlers: ThemeHandlers<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const mode = themeModeFor(selectedTheme)

    return h.div(
        [h.Class("grid gap-6")],
        [
            h.div(
                [
                    h.Class(
                        "grid grid-cols-1 gap-0 overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border sm:grid-cols-2 bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
                    ),
                    h.OnMouseLeave(handlers.onEndPreview),
                ],
                Array.map(THEME_FAMILIES, (family) =>
                    familyButton(selectedTheme, family, mode, handlers, h)
                )
            ),
            modeToggleView(selectedTheme, handlers, h),
        ]
    )
}
