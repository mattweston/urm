import { Array } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import {
    THEME_FAMILIES,
    resolveTheme,
    themeFamilyFor,
    themeModeFor,
    type ThemeFamily,
} from "@urm/domain/schemas/settings"
import * as AppIcon from "@urm/ui/foldkit/icons/view.ts"
import type { Model } from "./appearance.model.ts"
import type { Message } from "./appearance.message.ts"
import {
    ThemePreviewEnded,
    ThemePreviewed,
    ThemeSelected,
    ToggledThemeMenu,
} from "./appearance.message.ts"
import { swatch, type ThemeHandlers } from "./theme-grid.view.ts"
import { MENU_ATTRIBUTE } from "./appearance.subscription.ts"

const familyRow = <ParentMessage>(
    model: Model,
    family: ThemeFamily,
    handlers: ThemeHandlers<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const mode = themeModeFor(model.savedTheme)
    const theme = resolveTheme(family, mode)
    const isSelected = themeFamilyFor(model.savedTheme).id === family.id
    const colors = mode === "dark" ? family.dark_colors : family.light_colors

    return h.keyed("button")(
        family.id,
        [
            h.Type("button"),
            h.OnMouseEnter(handlers.onPreview(theme)),
            h.OnFocus(handlers.onPreview(theme)),
            h.OnClick(handlers.onSelect(theme)),
            h.Class(
                `flex min-w-0 cursor-pointer items-center justify-between gap-2 rounded-[var(--radius-surface-sm)] px-3 py-2 text-start text-sm transition-colors ${
                    isSelected
                        ? "bg-accent font-medium text-accent-foreground"
                        : "hover:bg-accent hover:text-accent-foreground"
                }`
            ),
        ],
        [
            // min-w-0 on both the row and the label: a flex/grid item defaults
            // to min-width:auto, which floors it at the text width and stops
            // truncate from ever engaging.
            h.span([h.Class("min-w-0 truncate")], [family.label]),
            h.span(
                [h.Class("flex shrink-0 gap-1")],
                Array.map(colors, (color) => swatch(color, h))
            ),
        ]
    )
}

export const themeMenuView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const handlers: ThemeHandlers<ParentMessage> = {
        onPreview: (theme) => toParentMessage(ThemePreviewed({ theme })),
        onEndPreview: toParentMessage(ThemePreviewEnded()),
        onSelect: (theme) => toParentMessage(ThemeSelected({ theme })),
    }
    const accessibleName = `Theme: ${themeFamilyFor(model.savedTheme).label}`

    return h.keyed("details")(
        "appearance-theme-menu",
        [
            h.Class("relative"),
            h.DataAttribute(MENU_ATTRIBUTE, "theme"),
            h.Open(model.isThemeMenuOpen),
            h.OnToggle((isOpen) =>
                toParentMessage(ToggledThemeMenu({ isOpen }))
            ),
            // Leaving the whole menu, not just one row, is what ends a preview:
            // the pointer can cross the gap between rows without reverting.
            h.OnMouseLeave(toParentMessage(ThemePreviewEnded())),
        ],
        [
            h.summary(
                [
                    h.AriaLabel(accessibleName),
                    h.Title(accessibleName),
                    h.Class(
                        "flex size-10 cursor-pointer list-none items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-ring focus-visible:outline-offset-[var(--focus-outline-offset)] [&::-webkit-details-marker]:hidden"
                    ),
                ],
                [AppIcon.IconPaintRoller({ class: "size-4" })]
            ),
            h.div(
                [
                    h.Class(
                        "fixed end-4 top-18 z-30 grid max-h-[calc(100dvh-5.5rem)] w-[min(18rem,calc(100%-2rem))] gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-3 [box-shadow:var(--shadow-overlay)]"
                    ),
                ],
                [
                    h.div(
                        [
                            h.Class(
                                // overflow-x-hidden is not redundant: setting
                                // one axis to auto computes the other from
                                // visible to auto, which is where the stray
                                // horizontal scrollbar came from.
                                "grid min-h-0 max-h-80 gap-1 overflow-y-auto overflow-x-hidden overscroll-contain"
                            ),
                            h.Role("group"),
                            h.AriaLabel("Theme family"),
                        ],
                        Array.map(THEME_FAMILIES, (family) =>
                            familyRow(model, family, handlers, h)
                        )
                    ),
                ]
            ),
        ]
    )
}

export const themeModeButtonView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const family = themeFamilyFor(model.savedTheme)
    const currentMode = themeModeFor(model.savedTheme)
    const nextMode = currentMode === "dark" ? "light" : "dark"
    const accessibleName = `Switch to ${nextMode} mode`
    const icon = nextMode === "light" ? AppIcon.IconSun() : AppIcon.IconMoon()

    return h.button(
        [
            h.Type("button"),
            h.AriaLabel(accessibleName),
            h.Title(accessibleName),
            h.OnClick(
                toParentMessage(
                    ThemeSelected({ theme: resolveTheme(family, nextMode) })
                )
            ),
            h.Class(
                "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-ring focus-visible:outline-offset-[var(--focus-outline-offset)]"
            ),
        ],
        [icon]
    )
}
