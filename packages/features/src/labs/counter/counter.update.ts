import { Match as M } from "effect"
import { Command } from "foldkit"
import type { Model } from "./counter.model.ts"
import type { Message } from "./counter.message.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            ClickedDecrement: () => [{ ...model, count: model.count - 1 }, []],
            ClickedIncrement: () => [{ ...model, count: model.count + 1 }, []],
            ClickedReset: () => [{ ...model, count: 0 }, []],
        })
    )

export const init = (): UpdateReturn => [{ count: 0 }, []]
