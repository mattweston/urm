/** # Learn route changes
 *
 *  Keeps the grouped lessons in step with the URL. Foldkit and Visual Effect
 *  own a family of sub-routes, so moving within one is an update and arriving
 *  from outside it is a fresh init; every other lesson is route-independent and
 *  passes through untouched.
 */
import { Command } from "foldkit"

import * as FoldkitLesson from "@urm/features/learn/walkthrough"
import * as EffectRunner from "@urm/features/learn/runner"

import { modifyFields } from "foldkit/struct"

import {
    GotFoldkitMessage,
    GotEffectRunnerMessage,
    type Message,
} from "./message.ts"
import type { Model } from "./model.ts"
import type { Services } from "./update.ts"

export type ChangedRouteReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<Message, never, Services>>,
]

/** `next_path` and `previous_path` are the incoming and outgoing `/learn/...`
 *  paths, or the empty string when that side of the navigation was not a Learn
 *  route. */
export const changed_route = (
    model: Model,
    next_path: string,
    previous_path: string
): ChangedRouteReturn => {
    const { model: foldkit, commands: foldkit_commands = [] } =
        FoldkitLesson.isFoldkitPath(next_path)
            ? FoldkitLesson.isFoldkitPath(previous_path)
                ? FoldkitLesson.update(
                      model.foldkit,
                      FoldkitLesson.ChangedFoldkitRoute({
                          route: FoldkitLesson.foldkitRouteForPath(next_path),
                      })
                  )
                : FoldkitLesson.init(
                      FoldkitLesson.foldkitRouteForPath(next_path)
                  )
            : { model: model.foldkit, commands: [] }

    const { model: effect_runner, commands: effect_runner_commands = [] } =
        EffectRunner.isEffectExamplePath(next_path)
            ? EffectRunner.isEffectExamplePath(previous_path)
                ? EffectRunner.update(
                      model.effect_runner,
                      EffectRunner.ChangedExampleRoute({
                          route: EffectRunner.effectRouteForPath(next_path),
                      })
                  )
                : EffectRunner.init(EffectRunner.effectRouteForPath(next_path))
            : { model: model.effect_runner, commands: [] }

    return [
        modifyFields(model, {
            foldkit: () => foldkit,
            effect_runner: () => effect_runner,
        }),
        [
            ...(FoldkitLesson.isFoldkitPath(next_path)
                ? Command.mapMessages(foldkit_commands, (message) =>
                      GotFoldkitMessage({ message })
                  )
                : []),
            ...(EffectRunner.isEffectExamplePath(next_path)
                ? Command.mapMessages(effect_runner_commands, (message) =>
                      GotEffectRunnerMessage({ message })
                  )
                : []),
        ],
    ]
}
