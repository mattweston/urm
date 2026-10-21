import { Effect, Match as M } from "effect"
import { Command, Update } from "foldkit"
import * as Ui from "@foldkit/ui"
import { evo } from "foldkit/struct"

import { GotFixedMessage, GotVariableMessage, type Message } from "./message.ts"
import type { Model } from "./model.ts"
import { ROW_COUNT } from "./view.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const ROW_HEIGHT_PX = 56

export const init = (): UpdateReturn => [
    {
        fixed: Ui.VirtualList.init({
            id: "labs-virtual-list-fixed",
            rowHeightPx: ROW_HEIGHT_PX,
        }),
        variable: Ui.VirtualList.init({
            id: "labs-virtual-list-variable",
            rowHeightPx: ROW_HEIGHT_PX,
        }),
    },
    [],
]

const toFixed = (
    result: Update.Return<Ui.VirtualList.Model, Ui.VirtualList.Message>,
    model: Model
): UpdateReturn => [
    evo(model, { fixed: () => result.model }),
    (result.commands ?? []).map(
        Command.mapEffect(Effect.map((message) => GotFixedMessage({ message })))
    ),
]

const toVariable = (
    result: Update.Return<Ui.VirtualList.Model, Ui.VirtualList.Message>,
    model: Model
): UpdateReturn => [
    evo(model, { variable: () => result.model }),
    (result.commands ?? []).map(
        Command.mapEffect(
            Effect.map((message) => GotVariableMessage({ message }))
        )
    ),
]

const middleIndex = Math.floor(ROW_COUNT / 2)

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            GotFixedMessage: ({ message }) =>
                toFixed(Ui.VirtualList.update(model.fixed, message), model),
            GotVariableMessage: ({ message }) =>
                toVariable(
                    Ui.VirtualList.update(model.variable, message),
                    model
                ),
            ClickedScrollToMiddle: () =>
                toFixed(
                    Ui.VirtualList.scrollToIndex(model.fixed, middleIndex),
                    model
                ),
            ClickedVariableScrollToMiddle: () =>
                toVariable(
                    Ui.VirtualList.scrollToIndex(model.variable, middleIndex),
                    model
                ),
        })
    )
