/** # Learn update
 *
 *  Routes each lesson's Message to that lesson's own update and lifts the
 *  resulting Commands back into the Learn Message union. Lessons differ in the
 *  shape they return — some a `[model, commands]` tuple, some an
 *  `{ model, commands }` record — so each branch adapts its own.
 */
import { Match as M } from "effect"
import { Command } from "foldkit"
import { modifyFields } from "foldkit/struct"

import * as ApiEffect from "@urm/features/learn/api-effect"
import * as ArrayLesson from "@urm/features/learn/array"
import * as CacheLesson from "@urm/features/learn/cache"
import * as EffectLesson from "@urm/features/learn/effect"
import * as FiberLesson from "@urm/features/learn/fiber"
import * as FunctionLesson from "@urm/features/learn/function"
import * as PersistedQueueLesson from "@urm/features/learn/persisted-queue"
import * as RecordLesson from "@urm/features/learn/record"
import * as ResultLesson from "@urm/features/learn/result"
import * as SchemaLesson from "@urm/features/learn/schema"
import * as StringLesson from "@urm/features/learn/string"
import * as TupleLesson from "@urm/features/learn/tuple"
import * as GeneratorYieldLesson from "@urm/features/learn/generator-yield"

import * as FoldkitLesson from "@urm/features/learn/walkthrough"
import * as ManagedResourceLayer from "@urm/features/learn/managed-resource-layer"
import * as NullishCoalescingInput from "@urm/features/learn/nullish-coalescing-input"
import * as NumberLesson from "@urm/features/learn/number"
import * as Reduce from "@urm/features/learn/reduce"
import * as EffectRunner from "@urm/features/learn/runner"

import {
    GotArrayMessage,
    GotCacheMessage,
    GotEffectMessage,
    GotFiberMessage,
    GotFunctionMessage,
    GotPersistedQueueMessage,
    GotRecordMessage,
    GotResultMessage,
    GotSchemaMessage,
    GotStringMessage,
    GotTupleMessage,
    GotGeneratorYieldMessage,
    GotApiEffectMessage,
    GotFoldkitMessage,
    GotManagedResourceLayerMessage,
    GotNullishCoalescingInputMessage,
    GotNumberMessage,
    GotReduceMessage,
    GotEffectRunnerMessage,
    type Message,
} from "./message.ts"
import type { Model } from "./model.ts"

/** Everything the routed lessons need from the runtime, aggregated so `main.ts`
 *  names one type instead of one per lesson. */
export type Services =
    | ManagedResourceLayer.EngineService
    | FoldkitLesson.AudioService
    | EffectRunner.AudioService

export type UpdateReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<Message, never, Services>>,
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            GotArrayMessage: ({ message: lesson_message }) => {
                const { model: array, commands = [] } = ArrayLesson.update(
                    model.array,
                    lesson_message
                )
                return [
                    modifyFields(model, { array: () => array }),
                    Command.mapMessages(commands, (next_message) =>
                        GotArrayMessage({ message: next_message })
                    ),
                ]
            },
            GotCacheMessage: ({ message: lesson_message }) => {
                const { model: cache, commands = [] } = CacheLesson.update(
                    model.cache,
                    lesson_message
                )
                return [
                    modifyFields(model, { cache: () => cache }),
                    Command.mapMessages(commands, (next_message) =>
                        GotCacheMessage({ message: next_message })
                    ),
                ]
            },
            GotEffectMessage: ({ message: lesson_message }) => {
                const { model: effect, commands = [] } = EffectLesson.update(
                    model.effect,
                    lesson_message
                )
                return [
                    modifyFields(model, { effect: () => effect }),
                    Command.mapMessages(commands, (next_message) =>
                        GotEffectMessage({ message: next_message })
                    ),
                ]
            },
            GotFiberMessage: ({ message: lesson_message }) => {
                const { model: fiber, commands = [] } = FiberLesson.update(
                    model.fiber,
                    lesson_message
                )
                return [
                    modifyFields(model, { fiber: () => fiber }),
                    Command.mapMessages(commands, (next_message) =>
                        GotFiberMessage({ message: next_message })
                    ),
                ]
            },
            GotFunctionMessage: ({ message: lesson_message }) => {
                const { model: function_lesson, commands = [] } =
                    FunctionLesson.update(model.function_lesson, lesson_message)
                return [
                    modifyFields(model, { function_lesson: () => function_lesson }),
                    Command.mapMessages(commands, (next_message) =>
                        GotFunctionMessage({ message: next_message })
                    ),
                ]
            },
            GotPersistedQueueMessage: ({ message: lesson_message }) => {
                const { model: persisted_queue, commands = [] } =
                    PersistedQueueLesson.update(
                        model.persisted_queue,
                        lesson_message
                    )
                return [
                    modifyFields(model, { persisted_queue: () => persisted_queue }),
                    Command.mapMessages(commands, (next_message) =>
                        GotPersistedQueueMessage({ message: next_message })
                    ),
                ]
            },
            GotRecordMessage: ({ message: lesson_message }) => {
                const { model: record, commands = [] } = RecordLesson.update(
                    model.record,
                    lesson_message
                )
                return [
                    modifyFields(model, { record: () => record }),
                    Command.mapMessages(commands, (next_message) =>
                        GotRecordMessage({ message: next_message })
                    ),
                ]
            },
            GotResultMessage: ({ message: lesson_message }) => {
                const { model: result, commands = [] } = ResultLesson.update(
                    model.result,
                    lesson_message
                )
                return [
                    modifyFields(model, { result: () => result }),
                    Command.mapMessages(commands, (next_message) =>
                        GotResultMessage({ message: next_message })
                    ),
                ]
            },
            GotSchemaMessage: ({ message: lesson_message }) => {
                const { model: schema, commands = [] } = SchemaLesson.update(
                    model.schema,
                    lesson_message
                )
                return [
                    modifyFields(model, { schema: () => schema }),
                    Command.mapMessages(commands, (next_message) =>
                        GotSchemaMessage({ message: next_message })
                    ),
                ]
            },
            GotStringMessage: ({ message: lesson_message }) => {
                const { model: string, commands = [] } = StringLesson.update(
                    model.string,
                    lesson_message
                )
                return [
                    modifyFields(model, { string: () => string }),
                    Command.mapMessages(commands, (next_message) =>
                        GotStringMessage({ message: next_message })
                    ),
                ]
            },
            GotTupleMessage: ({ message: lesson_message }) => {
                const { model: tuple, commands = [] } = TupleLesson.update(
                    model.tuple,
                    lesson_message
                )
                return [
                    modifyFields(model, { tuple: () => tuple }),
                    Command.mapMessages(commands, (next_message) =>
                        GotTupleMessage({ message: next_message })
                    ),
                ]
            },
            GotGeneratorYieldMessage: ({ message: lesson_message }) => {
                const { model: generator_yield, commands = [] } =
                    GeneratorYieldLesson.update(
                        model.generator_yield,
                        lesson_message
                    )
                return [
                    modifyFields(model, { generator_yield: () => generator_yield }),
                    Command.mapMessages(commands, (next_message) =>
                        GotGeneratorYieldMessage({ message: next_message })
                    ),
                ]
            },
            GotApiEffectMessage: ({ message: lesson_message }) => {
                const [api_effect, commands] = ApiEffect.update(
                    model.api_effect,
                    lesson_message
                )
                return [
                    modifyFields(model, { api_effect: () => api_effect }),
                    Command.mapMessages(commands, (next_message) =>
                        GotApiEffectMessage({ message: next_message })
                    ),
                ]
            },
            GotFoldkitMessage: ({ message: lesson_message }) => {
                const { model: foldkit, commands = [] } = FoldkitLesson.update(
                    model.foldkit,
                    lesson_message
                )
                return [
                    modifyFields(model, { foldkit: () => foldkit }),
                    Command.mapMessages(commands, (next_message) =>
                        GotFoldkitMessage({ message: next_message })
                    ),
                ]
            },
            GotManagedResourceLayerMessage: ({ message: lesson_message }) => {
                const [managed_resource_layer, commands] =
                    ManagedResourceLayer.update(
                        model.managed_resource_layer,
                        lesson_message
                    )
                return [
                    modifyFields(model, {
                        managed_resource_layer: () => managed_resource_layer,
                    }),
                    Command.mapMessages(commands, (next_message) =>
                        GotManagedResourceLayerMessage({
                            message: next_message,
                        })
                    ),
                ]
            },
            GotNullishCoalescingInputMessage: ({ message: lesson_message }) => {
                const [nullish_coalescing_input, commands] =
                    NullishCoalescingInput.update(
                        model.nullish_coalescing_input,
                        lesson_message
                    )
                return [
                    modifyFields(model, {
                        nullish_coalescing_input: () =>
                            nullish_coalescing_input,
                    }),
                    Command.mapMessages(commands, (next_message) =>
                        GotNullishCoalescingInputMessage({
                            message: next_message,
                        })
                    ),
                ]
            },
            GotNumberMessage: ({ message: lesson_message }) => {
                const { model: number, commands = [] } = NumberLesson.update(
                    model.number,
                    lesson_message
                )
                return [
                    modifyFields(model, { number: () => number }),
                    Command.mapMessages(commands, (next_message) =>
                        GotNumberMessage({ message: next_message })
                    ),
                ]
            },
            GotReduceMessage: ({ message: lesson_message }) => {
                const [reduce, commands] = Reduce.update(
                    model.reduce,
                    lesson_message
                )
                return [
                    modifyFields(model, { reduce: () => reduce }),
                    Command.mapMessages(commands, (next_message) =>
                        GotReduceMessage({ message: next_message })
                    ),
                ]
            },
            GotEffectRunnerMessage: ({ message: lesson_message }) => {
                const { model: effect_runner, commands = [] } =
                    EffectRunner.update(model.effect_runner, lesson_message)
                return [
                    modifyFields(model, { effect_runner: () => effect_runner }),
                    Command.mapMessages(commands, (next_message) =>
                        GotEffectRunnerMessage({ message: next_message })
                    ),
                ]
            },
        })
    )
