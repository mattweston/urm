import { Option, Schema as S } from "effect"
import { Submodel, Update } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// CHILD SUBMODEL — Settings
// -----------------------------------------------------------------------------

export const Theme = S.Literals(["Light", "Dark", "System"])
export type Theme = typeof Theme.Type

export const SettingsModel = S.Struct({
    theme: Theme,
    notificationsEnabled: S.Boolean,
})
export type SettingsModel = typeof SettingsModel.Type

export const SettingsMessage = defineMessageUnion({
    ChangedTheme: {
        theme: Theme,
    },
    ToggledNotifications: {},
})
export type SettingsMessage = typeof SettingsMessage.Type

export const SettingsOutMessage = defineMessageUnion({
    SelectedTheme: {
        theme: Theme,
    },
})
export type SettingsOutMessage = typeof SettingsOutMessage.Type

export const settingsInit = (): SettingsModel =>
    SettingsModel.make({
        theme: "System",
        notificationsEnabled: true,
    })

type SettingsUpdateReturn = Update.ReturnWithOutMessage<
    SettingsModel,
    SettingsMessage,
    SettingsOutMessage
>

export const settingsUpdate = (
    model: SettingsModel,
    message: SettingsMessage
) =>
    SettingsMessage.match<SettingsUpdateReturn>(message, {
        ChangedTheme: ({ theme }) => ({
            model: evo(model, {
                theme: () => theme,
            }),
            outMessage: SettingsOutMessage.SelectedTheme({
                theme,
            }),
        }),

        ToggledNotifications: () => ({
            model: evo(model, {
                notificationsEnabled: (enabled) => !enabled,
            }),
        }),
    })

// Parent-initiated changes still enter through a child-owned helper.
// The parent does not reach into SettingsModel with evo itself.
export const setTheme = (model: SettingsModel, theme: Theme) =>
    settingsUpdate(
        model,
        SettingsMessage.ChangedTheme({
            theme,
        })
    )

// Parent-owned data needed only while rendering belongs in ViewInputs,
// not duplicated into the child Model.
export type SettingsViewInputs = Readonly<{
    currentUser: string
    sectionLabel: string
}>

export const settingsView = Submodel.defineView<
    SettingsModel,
    SettingsMessage,
    SettingsViewInputs
>((model, { currentUser, sectionLabel }, h) =>
    h.section(
        [h.Class("rounded-lg border p-4")],
        [
            h.h2([], [sectionLabel]),
            h.p([], [`Settings for ${currentUser}`]),
            h.p([], [`Theme: ${model.theme}`]),
            h.div(
                [],
                [
                    h.button(
                        [
                            h.OnClick(
                                SettingsMessage.ChangedTheme({
                                    theme: "Light",
                                })
                            ),
                        ],
                        ["Light"]
                    ),
                    h.button(
                        [
                            h.OnClick(
                                SettingsMessage.ChangedTheme({
                                    theme: "Dark",
                                })
                            ),
                        ],
                        ["Dark"]
                    ),
                    h.button(
                        [
                            h.OnClick(
                                SettingsMessage.ChangedTheme({
                                    theme: "System",
                                })
                            ),
                        ],
                        ["System"]
                    ),
                ]
            ),
            h.button(
                [h.OnClick(SettingsMessage.ToggledNotifications())],
                [
                    model.notificationsEnabled
                        ? "Disable notifications"
                        : "Enable notifications",
                ]
            ),
        ]
    )
)

// -----------------------------------------------------------------------------
// PARENT
// -----------------------------------------------------------------------------

export const ParentModel = S.Struct({
    currentUser: S.String,
    settings: SettingsModel,
    lastChildFact: S.String,
})
export type ParentModel = typeof ParentModel.Type

export const ParentMessage = defineMessageUnion({
    GotSettingsMessage: {
        message: SettingsMessage,
    },
    ClickedResetSettings: {},
})
export type ParentMessage = typeof ParentMessage.Type

export const parentInit = (): ParentModel =>
    ParentModel.make({
        currentUser: "Ada Lovelace",
        settings: settingsInit(),
        lastChildFact: "none",
    })

// Child OutMessages stop at this parent and become parent state changes.
export const foldSettingsOutMessage = (
    outMessage: SettingsOutMessage,
    _context: Update.FoldContext<SettingsMessage, ParentMessage>
) =>
    SettingsOutMessage.match<Update.Step<ParentModel, ParentMessage>>(
        outMessage,
        {
            SelectedTheme:
                ({ theme }) =>
                (model) => ({
                    model: evo(model, {
                        lastChildFact: () => `SelectedTheme(${theme})`,
                    }),
                }),
        }
    )

// Normal child Message routing.
export const foldSettings = Update.foldChild({
    update: settingsUpdate,

    read: (model: ParentModel) => Option.some(model.settings),

    write: (model, nextSettings) =>
        evo(model, {
            settings: () => nextSettings,
        }),

    toParentMessage: (message) =>
        ParentMessage.GotSettingsMessage({
            message,
        }),

    foldOutMessage: foldSettingsOutMessage,
})

// Parent-initiated transition through exported child helper.
export const foldSettingsTheme = Update.foldChild({
    update: setTheme,

    read: (model: ParentModel) => Option.some(model.settings),

    write: (model, nextSettings) =>
        evo(model, {
            settings: () => nextSettings,
        }),

    toParentMessage: (message) =>
        ParentMessage.GotSettingsMessage({
            message,
        }),

    foldOutMessage: foldSettingsOutMessage,
})

type ParentUpdateReturn = Update.Return<ParentModel, ParentMessage>

export const parentUpdate = (model: ParentModel, message: ParentMessage) =>
    ParentMessage.match<ParentUpdateReturn>(message, {
        GotSettingsMessage: ({ message }) => foldSettings(model, message),

        ClickedResetSettings: () => foldSettingsTheme(model, "System"),
    })

// The real parent embed: the boundary has a slot id, child Model, branded
// child view, per-render ViewInputs, and one Message wrapper.
export const settingsEmbed = (
    model: ParentModel,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.submodel({
        slotId: "settings",
        model: model.settings,
        view: settingsView,
        viewInputs: {
            currentUser: model.currentUser,
            sectionLabel: "Preferences",
        },
        toParentMessage: (message) =>
            ParentMessage.GotSettingsMessage({
                message,
            }),
    })

// -----------------------------------------------------------------------------
// TEACHING DEMO
// -----------------------------------------------------------------------------

export const Stage = S.Literals(["Ownership", "Fold", "View", "Out"])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = ["Ownership", "Fold", "View", "Out"]

export const DemoModel = S.Struct({
    stage: Stage,
    parent: ParentModel,
    simulatedLateMessage: S.Boolean,
})
export type DemoModel = typeof DemoModel.Type

export const DemoMessage = defineMessageUnion({
    SelectedSubmodelStage: {
        stage: Stage,
    },

    GotParentMessage: {
        message: ParentMessage,
    },

    ClickedSimulateLateMessage: {},

    ClickedResetSubmodelDemo: {},
})
export type DemoMessage = typeof DemoMessage.Type

export const demoInit: DemoModel = DemoModel.make({
    stage: "Ownership",
    parent: parentInit(),
    simulatedLateMessage: false,
})

type DemoUpdateReturn = Update.Return<DemoModel, DemoMessage>

export const demoUpdate = (model: DemoModel, message: DemoMessage) =>
    DemoMessage.match<DemoUpdateReturn>(message, {
        SelectedSubmodelStage: ({ stage }) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        GotParentMessage: ({ message }) => {
            const next = parentUpdate(model.parent, message)

            return {
                model: evo(model, {
                    parent: () => next.model,
                }),
            }
        },

        ClickedSimulateLateMessage: () => ({
            model: evo(model, {
                simulatedLateMessage: () => true,
            }),
        }),

        ClickedResetSubmodelDemo: () => ({
            model: demoInit,
        }),
    })

// -----------------------------------------------------------------------------
// Pure visual helpers
// -----------------------------------------------------------------------------

export const ownershipFacts = (
    model: ParentModel
): ReadonlyArray<readonly [string, string]> => [
    ["parent owns", "currentUser + child placement"],
    ["child owns", "theme + notifications + child Messages"],
    [
        "parent stores",
        `settings: { theme: ${model.settings.theme}, notifications: ${model.settings.notificationsEnabled} }`,
    ],
    ["boundary", "parent never mutates inside settings directly"],
]

export const foldSteps = (model: ParentModel): ReadonlyArray<string> => [
    `read(parent) → Some(SettingsModel: ${model.settings.theme})`,
    "settingsUpdate(child, message)",
    "write(parent, nextSettings)",
    "lift child Commands with GotSettingsMessage",
    "fold child OutMessage into parent state",
]

export const viewBoundaryFacts = (
    model: ParentModel
): ReadonlyArray<readonly [string, string]> => [
    ["slotId", "settings"],
    ["child builder", "HtmlBuilder<SettingsMessage>"],
    ["parent builder", "HtmlBuilder<ParentMessage>"],
    ["ViewInputs.currentUser", model.currentUser],
]

export const outMessageFacts = (model: ParentModel): ReadonlyArray<string> => [
    "ChangedTheme updates the child Model.",
    "The same branch emits OutMessage.SelectedTheme.",
    "foldOutMessage receives the parent after the child is written back.",
    `parent.lastChildFact = ${model.lastChildFact}`,
]
