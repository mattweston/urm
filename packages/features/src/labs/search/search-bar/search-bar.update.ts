import { Match as M } from "effect"
import { evo } from "foldkit/struct"
import type { Message } from "./search-bar.message.ts"
import { type Model } from "./search-bar.model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<never>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const init = (): readonly [Model, ReadonlyArray<never>] => [
    {
        isOpen: false,
        query: "",
    },
    [],
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            MountedSearchBar: () => [model, []],
            ToggledSearchBarIsOpen: () => [
                evo(model, {
                    isOpen: (isOpen) => !isOpen,
                    query: () => "",
                }),
                [],
            ],
            ChangedSearchBarQuery: ({ value }) => [
                evo(model, {
                    query: () => value,
                    isOpen: () => true,
                }),
                [],
            ],
            ClosedSearchBar: () => [
                evo(model, {
                    isOpen: () => false,
                    query: () => "",
                }),
                [],
            ],
            ClickedSearchBarItem: () => [
                evo(model, {
                    isOpen: () => false,
                    query: () => "",
                }),
                [],
            ],
        })
    )
