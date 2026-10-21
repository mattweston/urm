import { Match as M } from "effect"
import type { Command } from "foldkit"
import { getThemeFromDocumentCookie } from "../theme/theme.runtime.ts"
import type { Model } from "./appearance.model.ts"
import type { Message } from "./appearance.message.ts"
import {
    ApplyAppearanceFont,
    ApplyAppearanceTheme,
    SaveAppearanceFont,
    SaveAppearanceTheme,
    SaveAppearanceThemeDeviceCache,
} from "./appearance.command.ts"
import {
    codeFontFor,
    readStoredCodeFont,
    readStoredFont,
} from "./appearance.runtime.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

// Read straight from the cookie and localStorage rather than through commands:
// `bootstrap` has already painted with these values, and an init command would
// repaint a frame later.
export const init = (): UpdateReturn => {
    const theme = getThemeFromDocumentCookie()
    const font = readStoredFont()
    const codeFont = readStoredCodeFont()

    return [
        {
            theme,
            savedTheme: theme,
            font,
            savedFont: font,
            codeFont,
            savedCodeFont: codeFont,
            isSavingTheme: false,
            isThemeMenuOpen: false,
            isFontMenuOpen: false,
        },
        [],
    ]
}

type ThemePersistence = "account" | "device_cache"

const updateWithThemePersistence = (
    model: Model,
    message: Message,
    theme_persistence: ThemePersistence
): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            ThemePreviewed: ({ theme }) => [
                { ...model, theme },
                [ApplyAppearanceTheme({ theme })],
            ],

            ThemePreviewEnded: () => [
                { ...model, theme: model.savedTheme },
                [ApplyAppearanceTheme({ theme: model.savedTheme })],
            ],

            // savedTheme moves with the click, not with the RPC reply: the
            // pointer usually leaves the button before the save lands, and
            // reverting to the previous theme in between reads as a flicker.
            ThemeSelected: ({ theme }) => [
                {
                    ...model,
                    theme,
                    savedTheme: theme,
                    isSavingTheme: true,
                    isThemeMenuOpen: false,
                },
                [
                    ApplyAppearanceTheme({ theme }),
                    theme_persistence === "account"
                        ? SaveAppearanceTheme({ theme })
                        : SaveAppearanceThemeDeviceCache({ theme }),
                ],
            ],

            ThemeApplied: () => [model, []],

            ThemeSaved: () => [{ ...model, isSavingTheme: false }, []],

            ThemeSaveFailed: () => [{ ...model, isSavingTheme: false }, []],

            ThemeChangedElsewhere: ({ theme }) => [
                { ...model, theme, savedTheme: theme },
                [],
            ],

            FontPreviewed: ({ font }) => {
                const codeFont = codeFontFor(font, model.savedCodeFont)

                return [
                    { ...model, font, codeFont },
                    [ApplyAppearanceFont({ font, codeFont })],
                ]
            },

            FontPreviewEnded: () => [
                {
                    ...model,
                    font: model.savedFont,
                    codeFont: model.savedCodeFont,
                },
                [
                    ApplyAppearanceFont({
                        font: model.savedFont,
                        codeFont: model.savedCodeFont,
                    }),
                ],
            ],

            FontSelected: ({ font }) => {
                const codeFont = codeFontFor(font, model.savedCodeFont)

                return [
                    {
                        ...model,
                        font,
                        savedFont: font,
                        codeFont,
                        savedCodeFont: codeFont,
                        isFontMenuOpen: false,
                    },
                    [SaveAppearanceFont({ font, codeFont })],
                ]
            },

            FontApplied: () => [model, []],

            AppearancePreferencesLoaded: ({ theme, font, codeFont }) => [
                {
                    ...model,
                    theme,
                    savedTheme: theme,
                    font,
                    savedFont: font,
                    codeFont,
                    savedCodeFont: codeFont,
                    isSavingTheme: false,
                },
                [
                    ApplyAppearanceTheme({ theme }),
                    SaveAppearanceThemeDeviceCache({ theme }),
                    SaveAppearanceFont({ font, codeFont }),
                ],
            ],

            // Opening one menu closes the other. The outside-click subscription
            // cannot do this: its selector matches either menu, so a click on
            // the sibling trigger reads as inside and never dismisses.
            ToggledThemeMenu: ({ isOpen }) =>
                isOpen
                    ? [
                          {
                              ...model,
                              isThemeMenuOpen: true,
                              isFontMenuOpen: false,
                              font: model.savedFont,
                              codeFont: model.savedCodeFont,
                          },
                          [
                              ApplyAppearanceFont({
                                  font: model.savedFont,
                                  codeFont: model.savedCodeFont,
                              }),
                          ],
                      ]
                    : [{ ...model, isThemeMenuOpen: false }, []],

            ToggledFontMenu: ({ isOpen }) =>
                isOpen
                    ? [
                          {
                              ...model,
                              isFontMenuOpen: true,
                              isThemeMenuOpen: false,
                              theme: model.savedTheme,
                          },
                          [ApplyAppearanceTheme({ theme: model.savedTheme })],
                      ]
                    : [{ ...model, isFontMenuOpen: false }, []],

            DismissedMenus: () => [
                {
                    ...model,
                    isThemeMenuOpen: false,
                    isFontMenuOpen: false,
                    theme: model.savedTheme,
                    font: model.savedFont,
                    codeFont: model.savedCodeFont,
                },
                [
                    ApplyAppearanceTheme({ theme: model.savedTheme }),
                    ApplyAppearanceFont({
                        font: model.savedFont,
                        codeFont: model.savedCodeFont,
                    }),
                ],
            ],
        })
    )

export const update = (model: Model, message: Message): UpdateReturn =>
    updateWithThemePersistence(model, message, "account")

export const updateDeviceCache = (
    model: Model,
    message: Message
): UpdateReturn => updateWithThemePersistence(model, message, "device_cache")
