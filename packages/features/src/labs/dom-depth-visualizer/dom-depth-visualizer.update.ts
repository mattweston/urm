import { Match as M } from "effect"
import { Command } from "foldkit"
import {
    LoadPreference,
    savePreference,
} from "./dom-depth-visualizer.command.ts"
import type { Model } from "./dom-depth-visualizer.model.ts"
import type { Message } from "./dom-depth-visualizer.message.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const init = (): UpdateReturn => [
    { isActive: false },
    [LoadPreference()],
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            ClickedToggle: () => {
                const isActive = !model.isActive

                return [{ ...model, isActive }, [savePreference(isActive)]]
            },
            LoadedPreference: ({ isActive }) => [{ ...model, isActive }, []],
            CompletedSavePreference: () => [model, []],
        })
    )
