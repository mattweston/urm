import { Match as M } from "effect"
import { modifyFields } from "foldkit/struct"

import type { Message, VariableName } from "./variables.message.ts"
import type { Model } from "./variables.model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<never>]

// One setter per numeric variable, keyed by the literal union: a new variable
// will not compile until it can be set.
const setters: Readonly<
    Record<VariableName, (model: Model, value: number) => Model>
> = {
    count: (model, value) => modifyFields(model, { count: () => value }),
    width: (model, value) => modifyFields(model, { width: () => value }),
    height: (model, value) => modifyFields(model, { height: () => value }),
}

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ChangedVariable: ({ variable, value }) => [
                setters[variable](model, value),
                [],
            ],
            ChangedWorkspaceName: ({ workspaceName }) => [
                modifyFields(model, { workspaceName: () => workspaceName }),
                [],
            ],
            ToggledPublished: () => [
                modifyFields(model, { isPublished: (published) => !published }),
                [],
            ],
        })
    )
