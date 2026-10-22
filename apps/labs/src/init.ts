/** # Learn init
 *
 *  Builds every routed lesson's initial state in one pass. Lessons that derive
 *  their starting sub-route from the URL are given the current `/learn/...`
 *  path; the rest ignore it.
 */
import { Command } from "foldkit"

import * as ApiEffect from "@urm/features/labs/api-effect"
import * as ArrayLesson from "@urm/features/labs/array"
import * as CacheLesson from "@urm/features/labs/cache"
import * as EffectLesson from "@urm/features/labs/effect"
import * as FiberLesson from "@urm/features/labs/fiber"
import * as FunctionLesson from "@urm/features/labs/function"
import * as PersistedQueueLesson from "@urm/features/labs/persisted-queue"
import * as RecordLesson from "@urm/features/labs/record"
import * as ResultLesson from "@urm/features/labs/result"
import * as SchemaLesson from "@urm/features/labs/schema"
import * as StringLesson from "@urm/features/labs/string"
import * as TupleLesson from "@urm/features/labs/tuple"
import * as GeneratorYieldLesson from "@urm/features/labs/generator-yield"

import * as FoldkitLesson from "@urm/features/labs/walkthrough"
import * as ManagedResourceLayer from "@urm/features/labs/managed-resource-layer"
import * as NullishCoalescingInput from "@urm/features/labs/nullish-coalescing-input"
import * as NumberLesson from "@urm/features/labs/number"
import * as Reduce from "@urm/features/labs/reduce"
import * as EffectRunner from "@urm/features/labs/runner"
import { succeed_href } from "@urm/features/labs/constructors/succeed"

import {
    GotFoldkitMessage,
    GotEffectRunnerMessage,
    type Message,
} from "./message.ts"
import type { Model } from "./model.ts"
import type { Services } from "./update.ts"

export type InitReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<Message, never, Services>>,
]

/** `learn_path` is the current path when the app opened on a Learn route, and
 *  the empty string otherwise; each lesson falls back to its own default. */
export const init = (learn_path: string): InitReturn => {
    const [api_effect] = ApiEffect.init()
    const array = ArrayLesson.init
    const cache = CacheLesson.init
    const effect = EffectLesson.init
    const fiber = FiberLesson.init
    const function_lesson = FunctionLesson.init
    const persisted_queue = PersistedQueueLesson.init
    const record = RecordLesson.init
    const result = ResultLesson.init
    const schema = SchemaLesson.init
    const string = StringLesson.init
    const tuple = TupleLesson.init
    const generator_yield = GeneratorYieldLesson.init
    const { model: foldkit, commands: foldkit_commands = [] } =
        FoldkitLesson.init(
            FoldkitLesson.foldkitRouteForPath(
                FoldkitLesson.isFoldkitPath(learn_path)
                    ? learn_path
                    : FoldkitLesson.walkthrough_href("state/counter")
            )
        )
    const [managed_resource_layer] = ManagedResourceLayer.init()
    const [nullish_coalescing_input] = NullishCoalescingInput.init()
    const number = NumberLesson.init
    const [reduce] = Reduce.init()
    const { model: effect_runner, commands: effect_runner_commands = [] } =
        EffectRunner.init(
            EffectRunner.effectRouteForPath(
                EffectRunner.isEffectExamplePath(learn_path)
                    ? learn_path
                    : succeed_href()
            )
        )

    return [
        {
            api_effect,
            array,
            cache,
            effect,
            fiber,
            function_lesson,
            persisted_queue,
            record,
            result,
            schema,
            string,
            tuple,
            generator_yield,
            foldkit,
            managed_resource_layer,
            nullish_coalescing_input,
            number,
            reduce,
            effect_runner,
        },
        // Only the lesson actually being opened gets to run its init Commands;
        // the others are initialised for state alone.
        [
            ...(FoldkitLesson.isFoldkitPath(learn_path)
                ? Command.mapMessages(foldkit_commands, (message) =>
                      GotFoldkitMessage({ message })
                  )
                : []),
            ...(EffectRunner.isEffectExamplePath(learn_path)
                ? Command.mapMessages(effect_runner_commands, (message) =>
                      GotEffectRunnerMessage({ message })
                  )
                : []),
        ],
    ]
}
