import { Match as M } from "effect"
import { Command } from "foldkit"

import type { Model } from "./members.model.ts"
import type { Message } from "./members.message.ts"
import { LoadMembers } from "./members.command.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const init = (): UpdateReturn => [
    {
        loading: true,
        error: null,
        members: [],
    },
    [LoadMembers()],
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            MembersLoaded: ({ members }) => [
                {
                    ...model,
                    loading: false,
                    error: null,
                    members: [...members],
                },
                [],
            ],
            FailedLoadingMembers: ({ error }) => [
                {
                    ...model,
                    loading: false,
                    error,
                },
                [],
            ],
        })
    )
