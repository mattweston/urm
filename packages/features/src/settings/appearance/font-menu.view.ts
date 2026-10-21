import { Array } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { AppFont, Model } from "./appearance.model.ts"
import type { Message } from "./appearance.message.ts"
import {
    FontPreviewEnded,
    FontPreviewed,
    FontSelected,
    ToggledFontMenu,
} from "./appearance.message.ts"
import {
    FONT_LABELS,
    MONO_FONTS,
    SANS_FONTS,
    fontModeFor,
    type FontMode,
} from "./appearance.runtime.ts"
import { MENU_ATTRIBUTE } from "./appearance.subscription.ts"

const modeButton = <ParentMessage>(
    model: Model,
    mode: FontMode,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const isActive = fontModeFor(model.savedFont) === mode
    // Switching to a group picks that group's current member, so the toggle is
    // a font change in its own right rather than a filter with no effect.
    const font: AppFont = mode === "sans" ? "theme" : model.savedCodeFont
    const target: AppFont =
        font === "theme" && mode === "mono" ? "geist-mono" : font

    return h.button(
        [
            h.Type("button"),
            h.AriaPressed(String(isActive)),
            h.OnClick(toParentMessage(FontSelected({ font: target }))),
            h.Class(
                isActive
                    ? `cursor-pointer rounded-[var(--radius-control)] bg-background px-3 py-1.5 text-sm font-medium text-foreground [box-shadow:var(--shadow-control)] ${mode === "mono" ? "font-mono" : ""}`
                    : `cursor-pointer rounded-[var(--radius-control)] px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground ${mode === "mono" ? "font-mono" : ""}`
            ),
        ],
        [mode === "sans" ? "Sans" : "Mono"]
    )
}

const fontOption = <ParentMessage>(
    model: Model,
    font: AppFont,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const isSelected = model.savedFont === font

    return h.keyed("button")(
        font,
        [
            h.Type("button"),
            h.OnMouseEnter(toParentMessage(FontPreviewed({ font }))),
            h.OnFocus(toParentMessage(FontPreviewed({ font }))),
            h.OnClick(toParentMessage(FontSelected({ font }))),
            h.Class(
                `cursor-pointer rounded-[var(--radius-surface-sm)] px-3 py-2 text-start text-sm transition-colors ${
                    isSelected
                        ? "bg-accent font-medium text-accent-foreground"
                        : "hover:bg-accent hover:text-accent-foreground"
                }`
            ),
        ],
        [FONT_LABELS[font]]
    )
}

export const fontMenuView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const mode = fontModeFor(model.savedFont)
    const fonts = mode === "mono" ? MONO_FONTS : SANS_FONTS
    const accessibleName = `Font: ${FONT_LABELS[model.savedFont]}`

    return h.keyed("details")(
        "appearance-font-menu",
        [
            h.Class("relative"),
            h.DataAttribute(MENU_ATTRIBUTE, "font"),
            h.Open(model.isFontMenuOpen),
            h.OnToggle((isOpen) =>
                toParentMessage(ToggledFontMenu({ isOpen }))
            ),
            h.OnMouseLeave(toParentMessage(FontPreviewEnded())),
        ],
        [
            h.summary(
                [
                    h.AriaLabel(accessibleName),
                    h.Title(accessibleName),
                    h.Class(
                        "flex size-10 cursor-pointer list-none items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-card font-mono text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-ring focus-visible:outline-offset-[var(--focus-outline-offset)] [&::-webkit-details-marker]:hidden"
                    ),
                ],
                ["Aa"]
            ),
            h.div(
                [
                    h.Class(
                        "fixed end-4 top-18 z-30 grid max-h-[calc(100dvh-5.5rem)] w-[min(14rem,calc(100%-2rem))] gap-3 overflow-y-auto overscroll-contain rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-3 [box-shadow:var(--shadow-overlay)]"
                    ),
                ],
                [
                    h.div(
                        [
                            h.Class(
                                "grid grid-cols-2 gap-1 rounded-[var(--radius-surface)] bg-muted p-1"
                            ),
                            h.Role("group"),
                            h.AriaLabel("Font style"),
                        ],
                        [
                            modeButton(model, "sans", toParentMessage, h),
                            modeButton(model, "mono", toParentMessage, h),
                        ]
                    ),
                    h.div(
                        [
                            h.Class("grid gap-1"),
                            h.Role("group"),
                            h.AriaLabel(
                                mode === "mono"
                                    ? "Monospaced fonts"
                                    : "Sans-serif fonts"
                            ),
                        ],
                        Array.map(fonts, (font) =>
                            fontOption(model, font, toParentMessage, h)
                        )
                    ),
                ]
            ),
        ]
    )
}
