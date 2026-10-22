import { Effect, Option, Schema as S } from "effect"
import { Command, Runtime, type Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real application Flags / Model / Message
// -----------------------------------------------------------------------------

export const Theme = S.Literals(["System", "Light", "Dark"])
export type Theme = typeof Theme.Type

export const Flags = S.Struct({
    savedCount: S.Option(S.Number),
    savedTheme: S.Option(Theme),
    requestLabel: S.Option(S.String),
})
export type Flags = typeof Flags.Type

export const Model = S.Struct({
    count: S.Number,
    startingCount: S.Option(S.Number),
    theme: Theme,
    requestLabel: S.Option(S.String),
    startupWarm: S.Boolean,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
    ClickedIncrement: {},
    CompletedWarmStartup: {
        count: S.Number,
    },
})
export type Message = typeof Message.Type

// -----------------------------------------------------------------------------
// Startup Command: init can return Commands just like update
// -----------------------------------------------------------------------------

export const WarmStartup = Command.define("WarmStartup", {
    args: {
        count: S.Number,
    },
    messages: [Message.CompletedWarmStartup],
    execute: ({ count }) =>
        Effect.sleep("500 millis").pipe(
            Effect.as(
                Message.CompletedWarmStartup({
                    count,
                })
            )
        ),
})

// -----------------------------------------------------------------------------
// INIT
// -----------------------------------------------------------------------------

export const init: Runtime.ApplicationInit<Model, Message, Flags> = (flags) => {
    const count = Option.getOrElse(flags.savedCount, () => 0)

    const theme = Option.getOrElse(flags.savedTheme, () => "System" as const)

    return {
        model: Model.make({
            count,
            startingCount: flags.savedCount,
            theme,
            requestLabel: flags.requestLabel,
            startupWarm: false,
        }),

        // init returns the same Update.Return shape as update, so startup
        // work can be requested declaratively too.
        commands: [
            WarmStartup({
                count,
            }),
        ],
    }
}

// -----------------------------------------------------------------------------
// UPDATE
// -----------------------------------------------------------------------------

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
    Message.match<UpdateReturn>(message, {
        ClickedIncrement: () => ({
            model: modifyFields(model, {
                count: (count) => count + 1,
            }),
        }),

        CompletedWarmStartup: ({ count }) => ({
            model: modifyFields(model, {
                startupWarm: () => true,
            }),
        }),
    })

// -----------------------------------------------------------------------------
// Fresh-client Flags Effect
//
// This example stays dependency-light: it reads localStorage directly inside
// Effect.sync. A larger app can use KeyValueStore / platform layers exactly as
// the Foldkit guide demonstrates.
// -----------------------------------------------------------------------------

const flagsStorageKey = "foldkit-init-flags-demo"

export const defaultFlags = (): Flags =>
    Flags.make({
        savedCount: Option.none(),
        savedTheme: Option.none(),
        requestLabel: Option.none(),
    })

export const flags: Effect.Effect<Flags> = Effect.sync(() => {
    if (typeof localStorage === "undefined") {
        return defaultFlags()
    }

    const raw = localStorage.getItem(flagsStorageKey)

    if (raw === null) {
        return defaultFlags()
    }

    try {
        const parsed = JSON.parse(raw) as {
            readonly count?: unknown
            readonly theme?: unknown
        }

        const count =
            typeof parsed.count === "number" && Number.isFinite(parsed.count)
                ? Option.some(parsed.count)
                : Option.none<number>()

        const theme =
            parsed.theme === "System" ||
            parsed.theme === "Light" ||
            parsed.theme === "Dark"
                ? Option.some(parsed.theme)
                : Option.none<Theme>()

        return Flags.make({
            savedCount: count,
            savedTheme: theme,
            requestLabel: Option.none(),
        })
    } catch {
        return defaultFlags()
    }
})

// -----------------------------------------------------------------------------
// Runtime wiring shown in the lesson.
//
// A real entry module also supplies update/view/container. Kept as a function
// here so copying this lesson into the learn folder does not boot a second app.
// -----------------------------------------------------------------------------

export const freshBootSketch = `
const application = Runtime.makeApplication({
  Model,
  Flags,
  init,
  update,
  view,
  container: document.getElementById("root"),
})

Runtime.run(application, { flags })
`

export const hydrationSketch = `
SERVER / BUILD
  concrete Flags value
        ↓
renderToString(...)
        ↓
Schema-encoded handoff in HTML
        ↓
BROWSER
Runtime.hydrate(...)
        ↓
decode Flags with same Schema
        ↓
same init(flags)
        ↓
same first Model
`

// -----------------------------------------------------------------------------
// Teaching demo
// -----------------------------------------------------------------------------

export const Stage = S.Literals(["Init", "Flags", "Boot", "Hydrate"])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = ["Init", "Flags", "Boot", "Hydrate"]

export const FlagCase = S.Literals(["None", "Saved", "Partial", "Request"])
export type FlagCase = typeof FlagCase.Type

export const BootStep = S.Union([
    S.Literal(0),
    S.Literal(1),
    S.Literal(2),
    S.Literal(3),
    S.Literal(4),
])
export type BootStep = typeof BootStep.Type

export const DemoModel = S.Struct({
    stage: Stage,
    flagCase: FlagCase,
    bootStep: BootStep,
    hydrationServerFlags: FlagCase,
    hydrationClientFlags: FlagCase,
})
export type DemoModel = typeof DemoModel.Type

export const DemoMessage = defineMessageUnion({
    SelectedInitFlagsStage: {
        stage: Stage,
    },
    SelectedInitFlagCase: {
        flagCase: FlagCase,
    },
    ClickedAdvanceFreshBoot: {},
    ClickedResetFreshBoot: {},
    SelectedServerFlagCase: {
        flagCase: FlagCase,
    },
    SelectedClientFlagCase: {
        flagCase: FlagCase,
    },
    ClickedResetInitFlagsDemo: {},
})
export type DemoMessage = typeof DemoMessage.Type

export const demoInit: DemoModel = DemoModel.make({
    stage: "Init",
    flagCase: "Saved",
    bootStep: 0,
    hydrationServerFlags: "Saved",
    hydrationClientFlags: "None",
})

type DemoUpdateReturn = Update.Return<DemoModel, DemoMessage>

const nextBootStep = (step: BootStep): BootStep =>
    step === 0 ? 1 : step === 1 ? 2 : step === 2 ? 3 : step === 3 ? 4 : 4

export const demoUpdate = (model: DemoModel, message: DemoMessage) =>
    DemoMessage.match<DemoUpdateReturn>(message, {
        SelectedInitFlagsStage: ({ stage }) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedInitFlagCase: ({ flagCase }) => ({
            model: modifyFields(model, {
                flagCase: () => flagCase,
            }),
        }),

        ClickedAdvanceFreshBoot: () => ({
            model: modifyFields(model, {
                bootStep: nextBootStep,
            }),
        }),

        ClickedResetFreshBoot: () => ({
            model: modifyFields(model, {
                bootStep: () => 0,
            }),
        }),

        SelectedServerFlagCase: ({ flagCase }) => ({
            model: modifyFields(model, {
                hydrationServerFlags: () => flagCase,
            }),
        }),

        SelectedClientFlagCase: ({ flagCase }) => ({
            model: modifyFields(model, {
                hydrationClientFlags: () => flagCase,
            }),
        }),

        ClickedResetInitFlagsDemo: () => ({
            model: demoInit,
        }),
    })

// -----------------------------------------------------------------------------
// Pure visual helpers
// -----------------------------------------------------------------------------

export const flagsForCase = (flagCase: FlagCase): Flags => {
    switch (flagCase) {
        case "None":
            return Flags.make({
                savedCount: Option.none(),
                savedTheme: Option.none(),
                requestLabel: Option.none(),
            })

        case "Saved":
            return Flags.make({
                savedCount: Option.some(7),
                savedTheme: Option.some("Dark"),
                requestLabel: Option.none(),
            })

        case "Partial":
            return Flags.make({
                savedCount: Option.some(12),
                savedTheme: Option.none(),
                requestLabel: Option.none(),
            })

        case "Request":
            return Flags.make({
                savedCount: Option.some(4),
                savedTheme: Option.some("Light"),
                requestLabel: Option.some("request-42"),
            })
    }
}

export const initForCase = (flagCase: FlagCase) => init(flagsForCase(flagCase))

export const flagsLabel = (flagsValue: Flags): string =>
    JSON.stringify(
        {
            savedCount: Option.getOrElse(flagsValue.savedCount, () => null),
            savedTheme: Option.getOrElse(flagsValue.savedTheme, () => null),
            requestLabel: Option.getOrElse(flagsValue.requestLabel, () => null),
        },
        null,
        2
    )

export const modelLabel = (model: Model): string =>
    JSON.stringify(
        {
            count: model.count,
            startingCount: Option.getOrElse(model.startingCount, () => null),
            theme: model.theme,
            requestLabel: Option.getOrElse(model.requestLabel, () => null),
            startupWarm: model.startupWarm,
        },
        null,
        2
    )

export const bootSteps = (
    flagCase: FlagCase
): ReadonlyArray<
    Readonly<{
        title: string
        detail: string
    }>
> => {
    const flagsValue = flagsForCase(flagCase)
    const first = init(flagsValue)

    return [
        {
            title: "1 · Runtime.run",
            detail: "receives the Flags Effect",
        },
        {
            title: "2 · resolve Effect",
            detail: flagsLabel(flagsValue).replaceAll("\n", " "),
        },
        {
            title: "3 · validate boundary",
            detail: "Flags Schema is part of makeApplication",
        },
        {
            title: "4 · call init(flags)",
            detail: `count = ${first.model.count}, theme = ${first.model.theme}`,
        },
        {
            title: "5 · start app",
            detail: "first Model committed; init Commands are forked",
        },
    ]
}

export const hydrationComparison = (
    serverCase: FlagCase,
    clientCase: FlagCase
): Readonly<{
    serverFlags: Flags
    hypotheticalClientFlags: Flags
    serverModel: Model
    hypotheticalClientModel: Model
    same: boolean
}> => {
    const serverFlags = flagsForCase(serverCase)
    const clientFlags = flagsForCase(clientCase)

    const serverModel = init(serverFlags).model
    const clientModel = init(clientFlags).model

    return {
        serverFlags,
        hypotheticalClientFlags: clientFlags,
        serverModel,
        hypotheticalClientModel: clientModel,
        same: modelLabel(serverModel) === modelLabel(clientModel),
    }
}
