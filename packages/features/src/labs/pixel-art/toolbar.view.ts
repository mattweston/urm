import clsx from "clsx"
import { Array, Option, Schema as S } from "effect"
import { childAttributes, type Html, type HtmlBuilder } from "foldkit/html"

import { Button, Listbox, Switch } from "@foldkit/ui"

import { EMPTY_COLOR, GRID_SIZE_STRINGS } from "./constant.ts"
import { radioGroupView } from "../radio-group/controlled.ts"
import { ThemeListbox } from "./listbox.ts"
import {
    ClickedClear,
    GotThemeListboxMessage,
    SelectedColor,
    SelectedGridSize,
    SelectedTool,
    ToggledMirrorHorizontal,
    ToggledMirrorVertical,
    type PixelArtMessage,
} from "./message.ts"
import { PaletteIndex, type MirrorMode, type Tool } from "./model.ts"
import { PALETTE_THEMES, type PaletteTheme } from "./palette.ts"

const TOOLS: ReadonlyArray<Tool> = ["Brush", "Fill", "Eraser"]

export const TOOL_RADIO_GROUP_ID = "pixel-art-tool-picker"
export const GRID_SIZE_RADIO_GROUP_ID = "pixel-art-grid-size-picker"
export const PALETTE_RADIO_GROUP_ID = "pixel-art-palette-picker"
export const MIRROR_HORIZONTAL_SWITCH_ID = "pixel-art-mirror-horizontal"
export const MIRROR_VERTICAL_SWITCH_ID = "pixel-art-mirror-vertical"

const TOOL_SHORTCUTS: Record<Tool, string> = {
    Brush: "B",
    Fill: "F",
    Eraser: "E",
}

export const THEME_INDEX_STRINGS = Array.makeBy(PALETTE_THEMES.length, String)

export const THEME_LISTBOX_ANCHOR: Listbox.AnchorConfig = {
    placement: "bottom-start",
    gap: 4,
    padding: 8,
}

const SELECTED_CLASS = "bg-primary text-primary-foreground"

const UNSELECTED_CLASS =
    "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"

const NEUTRAL_BUTTON_CLASS = "bg-muted text-foreground"

const paletteIndexFromValue = (
    value: string,
    fallback: PaletteIndex
): PaletteIndex =>
    Option.getOrElse(
        S.decodeUnknownOption(PaletteIndex)(Number(value)),
        () => fallback
    )

const sectionLabel = <ParentMessage>(
    text: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2"
            ),
        ],
        [text]
    )

const trashIcon = <ParentMessage>(
    className: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.svg(
        [
            h.AriaHidden(true),
            h.Class(className),
            h.Xmlns("http://www.w3.org/2000/svg"),
            h.Fill("none"),
            h.ViewBox("0 0 24 24"),
            h.StrokeWidth("1.5"),
            h.Stroke("currentColor"),
        ],
        [
            h.path([
                h.StrokeLinecap("round"),
                h.StrokeLinejoin("round"),
                h.D(
                    "M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                ),
            ]),
        ]
    )

const chevronDownIcon = <ParentMessage>(
    className: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.svg(
        [
            h.AriaHidden(true),
            h.Class(className),
            h.Xmlns("http://www.w3.org/2000/svg"),
            h.Fill("none"),
            h.ViewBox("0 0 24 24"),
            h.StrokeWidth("1.5"),
            h.Stroke("currentColor"),
        ],
        [
            h.path([
                h.StrokeLinecap("round"),
                h.StrokeLinejoin("round"),
                h.D("M19.5 8.25l-7.5 7.5-7.5-7.5"),
            ]),
        ]
    )

const toolSectionView = <ParentMessage>(
    selectedTool: Tool,
    toParentMessage: (message: PixelArtMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [],
        [
            sectionLabel("Tools", h),
            radioGroupView(
                {
                    id: TOOL_RADIO_GROUP_ID,
                    selectedValue: Option.some(selectedTool),
                    options: TOOLS,
                    ariaLabel: "Drawing tool",
                    onSelect: (tool) => toParentMessage(SelectedTool({ tool })),
                    toView: ({ group, options }) =>
                        h.div(
                            [...group, h.Class("flex flex-col gap-1.5")],
                            options.map((option) => {
                                const tool = option.value

                                return h.button(
                                    [
                                        ...option.option,
                                        h.Class(
                                            clsx(
                                                "flex items-center justify-between px-3 py-1.5 rounded text-sm transition motion-reduce:transition-none w-full cursor-pointer [box-shadow:var(--shadow-control)]",
                                                option.isSelected
                                                    ? SELECTED_CLASS
                                                    : UNSELECTED_CLASS
                                            )
                                        ),
                                    ],
                                    [
                                        h.span([], [tool]),
                                        h.span(
                                            [h.Class("text-xs opacity-70")],
                                            [TOOL_SHORTCUTS[tool]]
                                        ),
                                    ]
                                )
                            })
                        ),
                },
                h
            ),
        ]
    )

const mirrorSectionView = <ParentMessage>(
    mirrorMode: MirrorMode,
    toParentMessage: (message: PixelArtMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const isMirrorHorizontal =
        mirrorMode === "Horizontal" || mirrorMode === "Both"
    const isMirrorVertical = mirrorMode === "Vertical" || mirrorMode === "Both"

    return h.div(
        [],
        [
            sectionLabel("Mirror", h),
            h.div(
                [h.Class("flex gap-2")],
                [
                    Switch.view(
                        {
                            id: MIRROR_HORIZONTAL_SWITCH_ID,
                            isChecked: isMirrorHorizontal,
                            onToggle: () =>
                                toParentMessage(ToggledMirrorHorizontal()),
                            toView: ({ button, label }) =>
                                h.div(
                                    [h.Class("flex-1")],
                                    [
                                        h.span(
                                            [...label, h.Class("sr-only")],
                                            ["Mirror horizontal"]
                                        ),
                                        h.button(
                                            [
                                                ...button,
                                                h.Class(
                                                    clsx(
                                                        "w-full px-3 py-1.5 rounded text-sm transition motion-reduce:transition-none cursor-pointer [box-shadow:var(--shadow-control)]",
                                                        isMirrorHorizontal
                                                            ? SELECTED_CLASS
                                                            : UNSELECTED_CLASS
                                                    )
                                                ),
                                            ],
                                            ["H"]
                                        ),
                                    ]
                                ),
                        },
                        h
                    ),
                    Switch.view(
                        {
                            id: MIRROR_VERTICAL_SWITCH_ID,
                            isChecked: isMirrorVertical,
                            onToggle: () =>
                                toParentMessage(ToggledMirrorVertical()),
                            toView: ({ button, label }) =>
                                h.div(
                                    [h.Class("flex-1")],
                                    [
                                        h.span(
                                            [...label, h.Class("sr-only")],
                                            ["Mirror vertical"]
                                        ),
                                        h.button(
                                            [
                                                ...button,
                                                h.Class(
                                                    clsx(
                                                        "w-full px-3 py-1.5 rounded text-sm transition motion-reduce:transition-none cursor-pointer [box-shadow:var(--shadow-control)]",
                                                        isMirrorVertical
                                                            ? SELECTED_CLASS
                                                            : UNSELECTED_CLASS
                                                    )
                                                ),
                                            ],
                                            ["V"]
                                        ),
                                    ]
                                ),
                        },
                        h
                    ),
                ]
            ),
        ]
    )
}

const sizeSectionView = <ParentMessage>(
    gridSize: number,
    toParentMessage: (message: PixelArtMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [],
        [
            sectionLabel("Grid size", h),
            radioGroupView(
                {
                    id: GRID_SIZE_RADIO_GROUP_ID,
                    selectedValue: Option.some(gridSize.toString()),
                    options: GRID_SIZE_STRINGS,
                    ariaLabel: "Grid size",
                    orientation: "Horizontal",
                    onSelect: (value) =>
                        toParentMessage(
                            SelectedGridSize({ size: Number(value) })
                        ),
                    toView: ({ group, options }) =>
                        h.div(
                            [...group, h.Class("flex gap-1")],
                            options.map((option) =>
                                h.button(
                                    [
                                        ...option.option,
                                        h.Class(
                                            clsx(
                                                "flex-1 px-2 py-1.5 rounded text-sm transition motion-reduce:transition-none cursor-pointer [box-shadow:var(--shadow-control)]",
                                                option.isSelected
                                                    ? SELECTED_CLASS
                                                    : UNSELECTED_CLASS
                                            )
                                        ),
                                    ],
                                    [option.value]
                                )
                            )
                        ),
                },
                h
            ),
        ]
    )

const themeListboxView = <ParentMessage>(
    themeListbox: Listbox.Model,
    theme: PaletteTheme,
    paletteThemeIndex: number,
    toParentMessage: (message: PixelArtMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.submodel({
        slotId: themeListbox.id,
        model: themeListbox,
        view: ThemeListbox.view,
        viewInputs: {
            anchor: THEME_LISTBOX_ANCHOR,
            items: THEME_INDEX_STRINGS,
            maybeSelectedValue: Option.some(paletteThemeIndex.toString()),
            itemToConfig: (indexString, { isSelected }) => {
                const themeName = Option.match(
                    Array.get(PALETTE_THEMES, Number(indexString)),
                    {
                        onNone: () => indexString,
                        onSome: (paletteTheme) => paletteTheme.name,
                    }
                )

                return {
                    className: clsx(
                        "px-3 py-2 text-sm cursor-pointer transition motion-reduce:transition-none [box-shadow:var(--shadow-control)]",
                        isSelected
                            ? SELECTED_CLASS
                            : "text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                    ),
                    content: h.div(
                        [h.Class("flex items-center justify-between")],
                        [
                            h.span([], [themeName]),
                            ...(isSelected
                                ? [h.span([h.Class("text-xs")], ["✓"])]
                                : []),
                        ]
                    ),
                }
            },
            buttonContent: h.div(
                [h.Class("flex items-center justify-between w-full")],
                [
                    h.span([], [theme.name]),
                    chevronDownIcon("w-4 h-4 text-muted-foreground", h),
                ]
            ),
            buttonAttributes: childAttributes([
                h.Class(
                    clsx(
                        "w-full px-3 py-1.5 rounded text-sm cursor-pointer transition motion-reduce:transition-none [box-shadow:var(--shadow-control)]",
                        NEUTRAL_BUTTON_CLASS,
                        "hover:bg-accent hover:text-accent-foreground"
                    )
                ),
            ]),
            itemsAttributes: childAttributes([
                h.Class(
                    "w-[var(--button-width)] rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-popover [box-shadow:var(--shadow-overlay)] overflow-hidden z-10 outline-none"
                ),
            ]),
            backdropAttributes: childAttributes([h.Class("fixed inset-0 z-0")]),
            attributes: childAttributes([h.Class("relative w-full mt-3")]),
        },
        toParentMessage: (message) =>
            toParentMessage(GotThemeListboxMessage({ message })),
    })

const paletteSectionView = <ParentMessage>(
    selectedColorIndex: PaletteIndex,
    theme: PaletteTheme,
    paletteThemeIndex: number,
    themeListbox: Listbox.Model,
    toParentMessage: (message: PixelArtMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const paletteIndexStrings = theme.colors.map((_, index) => index.toString())
    const selectedHexColor = theme.colors[selectedColorIndex] ?? EMPTY_COLOR

    return h.div(
        [],
        [
            sectionLabel("Colour", h),
            h.div(
                [h.Class("text-xs text-muted-foreground font-mono pb-3")],
                [selectedHexColor]
            ),
            radioGroupView(
                {
                    id: PALETTE_RADIO_GROUP_ID,
                    selectedValue: Option.some(selectedColorIndex.toString()),
                    options: paletteIndexStrings,
                    ariaLabel: "Colour palette",
                    orientation: "Horizontal",
                    onSelect: (value) =>
                        toParentMessage(
                            SelectedColor({
                                colorIndex: paletteIndexFromValue(
                                    value,
                                    selectedColorIndex
                                ),
                            })
                        ),
                    toView: ({ group, options }) =>
                        h.div(
                            [...group, h.Class("grid grid-cols-4 gap-2.5")],
                            options.map((option) => {
                                const hexColor =
                                    theme.colors[Number(option.value)] ??
                                    EMPTY_COLOR

                                return h.button(
                                    [
                                        ...option.option,
                                        h.Class(
                                            clsx(
                                                "aspect-square rounded-sm transition motion-reduce:transition-none cursor-pointer",
                                                {
                                                    "ring-2 ring-ring ring-offset-2 ring-offset-background":
                                                        option.isSelected,
                                                    "hover:scale-105 motion-reduce:hover:scale-100":
                                                        !option.isSelected,
                                                }
                                            )
                                        ),
                                        h.Style({ backgroundColor: hexColor }),
                                    ],
                                    [
                                        h.span(
                                            [
                                                ...option.label,
                                                h.Class("sr-only"),
                                            ],
                                            [hexColor]
                                        ),
                                    ]
                                )
                            })
                        ),
                },
                h
            ),
            themeListboxView(
                themeListbox,
                theme,
                paletteThemeIndex,
                toParentMessage,
                h
            ),
        ]
    )
}

const clearCanvasView = <ParentMessage>(
    isCanvasEmpty: boolean,
    toParentMessage: (message: PixelArtMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Button.view(
        {
            onClick: toParentMessage(ClickedClear()),
            isDisabled: isCanvasEmpty,
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            clsx(
                                "w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm transition motion-reduce:transition-none",
                                NEUTRAL_BUTTON_CLASS,
                                {
                                    "hover:bg-accent hover:text-accent-foreground cursor-pointer":
                                        !isCanvasEmpty,
                                    "opacity-40 cursor-not-allowed":
                                        isCanvasEmpty,
                                }
                            )
                        ),
                    ],
                    [trashIcon("w-4 h-4", h), h.span([], ["Clear canvas"])]
                ),
        },
        h
    )

export const toolPanelView = <ParentMessage>(
    mirrorMode: MirrorMode,
    tool: Tool,
    gridSize: number,
    selectedColorIndex: PaletteIndex,
    isCanvasEmpty: boolean,
    theme: PaletteTheme,
    paletteThemeIndex: number,
    themeListbox: Listbox.Model,
    toParentMessage: (message: PixelArtMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("w-full md:w-44 flex flex-col gap-5 flex-shrink-0")],
        [
            toolSectionView(tool, toParentMessage, h),
            mirrorSectionView(mirrorMode, toParentMessage, h),
            sizeSectionView(gridSize, toParentMessage, h),
            paletteSectionView(
                selectedColorIndex,
                theme,
                paletteThemeIndex,
                themeListbox,
                toParentMessage,
                h
            ),
            clearCanvasView(isCanvasEmpty, toParentMessage, h),
        ]
    )
