import { Array } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import * as AppIcon from "@urm/ui/foldkit/icons/view.ts"
import type { AppFont, Model } from "./appearance.model.ts"
import type { Message } from "./appearance.message.ts"
import {
    FontPreviewEnded,
    FontPreviewed,
    FontSelected,
    ThemePreviewEnded,
    ThemePreviewed,
    ThemeSelected,
} from "./appearance.message.ts"
import { FONT_LABELS, MONO_FONTS, SANS_FONTS } from "./appearance.runtime.ts"
import { themeGridView, type ThemeHandlers } from "./theme-grid.view.ts"

type SettingsLinks = Readonly<{
    sidebar_href?: string
    modules_href?: string
    theme_href: string
    fonts_href: string
}>

const page_heading = <ParentMessage>(
    title: string,
    description: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("grid gap-1")],
        [
            h.h1([h.Class("text-2xl font-semibold tracking-tight")], [title]),
            h.p([h.Class("text-sm text-muted-foreground")], [description]),
        ]
    )

const settings_card = <ParentMessage>(
    href: string,
    title: string,
    description: string,
    icon: Html,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.a(
        [
            h.Href(href),
            h.Class(
                "group grid gap-5 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6 text-card-foreground [box-shadow:var(--shadow-surface)] transition-colors hover:bg-accent"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "flex size-10 items-center justify-center rounded-[var(--radius-control)] bg-muted text-muted-foreground group-hover:text-accent-foreground"
                    ),
                ],
                [icon]
            ),
            h.div(
                [h.Class("grid gap-1")],
                [
                    h.h2([h.Class("font-semibold")], [title]),
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        [description]
                    ),
                ]
            ),
        ]
    )

export const appearanceSettingsOverviewView = <ParentMessage>(
    links: SettingsLinks,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("mx-auto grid w-full max-w-5xl gap-8 px-4 py-8 sm:px-6")],
        [
            page_heading(
                "Settings",
                "Choose how URM looks and reads on every screen.",
                h
            ),
            h.div(
                [h.Class("grid gap-4 sm:grid-cols-2")],
                [
                    ...(links.sidebar_href
                        ? [
                              settings_card(
                                  links.sidebar_href,
                                  "Sidebar",
                                  "Arrange and hide navigation items for this domain.",
                                  AppIcon.IconLayout({ class: "size-5" }),
                                  h
                              ),
                          ]
                        : []),
                    ...(links.modules_href
                        ? [
                              settings_card(
                                  links.modules_href,
                                  "Modules",
                                  "Manage feature availability for this domain.",
                                  AppIcon.IconLayoutGrid({ class: "size-5" }),
                                  h
                              ),
                          ]
                        : []),
                    settings_card(
                        links.theme_href,
                        "Theme",
                        "Choose a colour family and its light or dark variant.",
                        AppIcon.IconPaintRoller({ class: "size-5" }),
                        h
                    ),
                    settings_card(
                        links.fonts_href,
                        "Fonts",
                        "Set the reading and code typeface used throughout URM.",
                        AppIcon.IconFileText({ class: "size-5" }),
                        h
                    ),
                ]
            ),
        ]
    )

export const appearanceThemeSettingsView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const handlers: ThemeHandlers<ParentMessage> = {
        onPreview: (theme) => toParentMessage(ThemePreviewed({ theme })),
        onEndPreview: toParentMessage(ThemePreviewEnded()),
        onSelect: (theme) => toParentMessage(ThemeSelected({ theme })),
    }

    return h.div(
        [h.Class("mx-auto grid w-full max-w-5xl gap-8 px-4 py-8 sm:px-6")],
        [
            page_heading(
                "Theme",
                "Select a family, then switch between its light and dark variants.",
                h
            ),
            themeGridView(model.savedTheme, handlers, h),
            h.p(
                [h.Class("text-sm text-muted-foreground")],
                [
                    model.isSavingTheme
                        ? "Saving…"
                        : "Changes are saved automatically.",
                ]
            ),
        ]
    )
}

const font_option = <ParentMessage>(
    model: Model,
    font: AppFont,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const is_selected = model.savedFont === font

    return h.keyed("button")(
        font,
        [
            h.Type("button"),
            h.AriaPressed(String(is_selected)),
            h.OnMouseEnter(toParentMessage(FontPreviewed({ font }))),
            h.OnFocus(toParentMessage(FontPreviewed({ font }))),
            h.OnBlur(toParentMessage(FontPreviewEnded())),
            h.OnClick(toParentMessage(FontSelected({ font }))),
            h.Class(
                is_selected
                    ? "cursor-pointer rounded-[var(--radius-surface-sm)] border-(length:--surface-border-width) border-primary bg-[color-mix(in_oklab,var(--primary)_10%,var(--card))] p-4 text-left [box-shadow:var(--shadow-surface)]"
                    : "cursor-pointer rounded-[var(--radius-surface-sm)] border-(length:--surface-border-width) border-border bg-card p-4 text-left [box-shadow:var(--shadow-surface)] hover:bg-accent"
            ),
        ],
        [
            h.span([h.Class("block font-medium")], [FONT_LABELS[font]]),
            h.span(
                [h.Class("mt-1 block text-sm text-muted-foreground")],
                [font === "theme" ? "Follow the active theme" : "Aa Bb 0123"]
            ),
        ]
    )
}

const font_group = <ParentMessage>(
    title: string,
    fonts: ReadonlyArray<AppFont>,
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [h.Class("grid gap-3")],
        [
            h.h2([h.Class("text-sm font-semibold")], [title]),
            h.div(
                [
                    h.Class("grid gap-3 sm:grid-cols-2 lg:grid-cols-3"),
                    h.OnMouseLeave(toParentMessage(FontPreviewEnded())),
                ],
                Array.map(fonts, (font) =>
                    font_option(model, font, toParentMessage, h)
                )
            ),
        ]
    )

export const appearanceFontSettingsView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("mx-auto grid w-full max-w-5xl gap-8 px-4 py-8 sm:px-6")],
        [
            page_heading(
                "Fonts",
                "Hover to preview a typeface and select it to use it throughout URM.",
                h
            ),
            font_group("Sans serif", SANS_FONTS, model, toParentMessage, h),
            font_group("Monospaced", MONO_FONTS, model, toParentMessage, h),
            h.p(
                [h.Class("text-sm text-muted-foreground")],
                ["Changes are saved automatically."]
            ),
        ]
    )
