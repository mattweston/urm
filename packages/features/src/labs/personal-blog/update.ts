import { Match as M } from "effect"
import { Command } from "foldkit"
import { evo } from "foldkit/struct"

import * as Counter from "./island/counter.ts"
import { GotCounterMessage, type PersonalBlogMessage } from "./message.ts"
import type { PersonalBlogModel } from "./model.ts"
import { BlogAbout } from "./route.ts"

type UpdateReturn = readonly [
    PersonalBlogModel,
    ReadonlyArray<Command.Command<PersonalBlogMessage>>,
]

export const personalBlogInit = (): readonly [
    PersonalBlogModel,
    ReadonlyArray<Command.Command<PersonalBlogMessage>>,
] => [{ route: BlogAbout(), counter: Counter.init }, []]

export const personalBlogUpdate = (
    model: PersonalBlogModel,
    message: PersonalBlogMessage
): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ChangedBlogRoute: ({ route }) => [
                evo(model, { route: () => route }),
                [],
            ],

            GotCounterMessage: ({ message }) => {
                const [counter, counterCommands] = Counter.update(
                    model.counter,
                    message
                )

                return [
                    evo(model, { counter: () => counter }),
                    Command.mapMessages(counterCommands, (childMessage) =>
                        GotCounterMessage({ message: childMessage })
                    ),
                ]
            },
        })
    )
