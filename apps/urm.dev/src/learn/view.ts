/** # Learn view
 *
 *  Dispatches a `/learn/...` path to its lesson's view, falling back to the
 *  index. The index cards are generated from {@link lessons}, so a new lesson
 *  appears there by being in the catalogue.
 */
import type { Html, HtmlBuilder } from "foldkit/html"

import * as ApiEffect from "@urm/features/learn/api-effect"
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

import * as ArrayLesson from "@urm/features/learn/array"
import * as FoldkitLesson from "@urm/features/learn/walkthrough"
import * as ManagedResourceLayer from "@urm/features/learn/managed-resource-layer"
import * as NullishCoalescingInput from "@urm/features/learn/nullish-coalescing-input"
import * as NumberLesson from "@urm/features/learn/number"
import * as Reduce from "@urm/features/learn/reduce"
import * as EffectRunner from "@urm/features/learn/runner"

import { lessons, subject_for_path, type Subject } from "./lessons.ts"
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

/** The page shell every routed lesson sits in. Lessons render their own
 *  content only; the centring, width cap and padding live here so they are
 *  identical across lessons and a new lesson gets them for free.
 *
 *  Visual Effect opts out: it is a full-bleed canvas that sets its own padding
 *  in its stylesheet. */
const LESSON_SHELL_CLASS = "mx-auto w-full min-w-0 max-w-4xl px-4 py-10 sm:px-6"

const CARD_CLASS =
    "group grid gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground transition hover:border-primary/50 hover:bg-accent"

export const index_view = <ParentMessage>(
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.main(
        [h.Class("mx-auto grid w-full max-w-4xl gap-8 px-4 py-10 sm:px-6")],
        [
            h.header(
                [h.Class("grid gap-2")],
                [
                    h.p(
                        [h.Class("text-sm font-medium text-primary")],
                        ["Learn"]
                    ),
                    h.h1(
                        [h.Class("text-3xl font-bold tracking-tight")],
                        ["Learn by exploring working features"]
                    ),
                    h.p(
                        [h.Class("max-w-2xl text-muted-foreground")],
                        [
                            "Open a lesson to inspect a focused, interactive example.",
                        ]
                    ),
                ]
            ),
            ...lessons.map((lesson) =>
                h.keyed("a")(
                    lesson.tag,
                    [h.Href(lesson.href), h.Class(CARD_CLASS)],
                    [
                        lesson.icon({ class: "size-6 text-primary" }),
                        h.h2(
                            [h.Class("text-lg font-semibold")],
                            [lesson.label]
                        ),
                        h.p(
                            [
                                h.Class(
                                    "text-sm leading-6 text-muted-foreground"
                                ),
                            ],
                            [lesson.description]
                        ),
                    ]
                )
            ),
        ]
    )

const lesson_view = <ParentMessage>(
    model: Model,
    learn_path: string,
    to_parent_message: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html | undefined => {
    if (ArrayLesson.is_array_path(learn_path))
        return ArrayLesson.view(
            model.array,
            (message) => to_parent_message(GotArrayMessage({ message })),
            h
        )
    if (CacheLesson.is_cache_path(learn_path))
        return CacheLesson.view(
            model.cache,
            (message) => to_parent_message(GotCacheMessage({ message })),
            h
        )
    if (EffectLesson.is_effect_path(learn_path))
        return EffectLesson.view(
            model.effect,
            (message) => to_parent_message(GotEffectMessage({ message })),
            h
        )
    if (FiberLesson.is_fiber_path(learn_path))
        return FiberLesson.view(
            model.fiber,
            (message) => to_parent_message(GotFiberMessage({ message })),
            h
        )
    if (FunctionLesson.is_function_path(learn_path))
        return FunctionLesson.view(
            model.function_lesson,
            (message) => to_parent_message(GotFunctionMessage({ message })),
            h
        )
    if (PersistedQueueLesson.is_persisted_queue_path(learn_path))
        return PersistedQueueLesson.view(
            model.persisted_queue,
            (message) =>
                to_parent_message(GotPersistedQueueMessage({ message })),
            h
        )
    if (RecordLesson.is_record_path(learn_path))
        return RecordLesson.view(
            model.record,
            (message) => to_parent_message(GotRecordMessage({ message })),
            h
        )
    if (ResultLesson.is_result_path(learn_path))
        return ResultLesson.view(
            model.result,
            (message) => to_parent_message(GotResultMessage({ message })),
            h
        )
    if (SchemaLesson.is_schema_path(learn_path))
        return SchemaLesson.view(
            model.schema,
            (message) => to_parent_message(GotSchemaMessage({ message })),
            h
        )
    if (StringLesson.is_string_path(learn_path))
        return StringLesson.view(
            model.string,
            (message) => to_parent_message(GotStringMessage({ message })),
            h
        )
    if (TupleLesson.is_tuple_path(learn_path))
        return TupleLesson.view(
            model.tuple,
            (message) => to_parent_message(GotTupleMessage({ message })),
            h
        )
    if (GeneratorYieldLesson.is_generator_yield_path(learn_path))
        return GeneratorYieldLesson.view(
            model.generator_yield,
            (message) =>
                to_parent_message(GotGeneratorYieldMessage({ message })),
            h
        )
    if (FoldkitLesson.isFoldkitPath(learn_path))
        return h.submodel({
            slotId: "desktop-learn-foldkit",
            model: model.foldkit,
            view: FoldkitLesson.view,
            toParentMessage: (message) =>
                to_parent_message(GotFoldkitMessage({ message })),
        })
    if (NullishCoalescingInput.is_nullish_coalescing_input_path(learn_path))
        return NullishCoalescingInput.view(
            model.nullish_coalescing_input,
            (message) =>
                to_parent_message(
                    GotNullishCoalescingInputMessage({ message })
                ),
            h
        )
    if (NumberLesson.is_number_path(learn_path))
        return NumberLesson.view(
            model.number,
            (message) => to_parent_message(GotNumberMessage({ message })),
            h
        )
    if (Reduce.is_reduce_path(learn_path))
        return Reduce.view(
            model.reduce,
            (message) => to_parent_message(GotReduceMessage({ message })),
            h
        )
    if (ManagedResourceLayer.isManagedResourceLayerPath(learn_path))
        return ManagedResourceLayer.view(
            model.managed_resource_layer,
            (message) =>
                to_parent_message(GotManagedResourceLayerMessage({ message })),
            h
        )
    return ApiEffect.isApiEffectPath(learn_path)
        ? ApiEffect.view(
              model.api_effect,
              (message) => to_parent_message(GotApiEffectMessage({ message })),
              h
          )
        : undefined
}

/** A subject's own page: the lessons filed under it, in catalogue order. The
 *  Learn index lists everything; this lists one shelf of it. */
export const subject_view = <ParentMessage>(
    subject: Subject,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.main(
        [h.Class("mx-auto grid w-full max-w-4xl gap-8 px-4 py-10 sm:px-6")],
        [
            h.header(
                [h.Class("grid gap-2")],
                [
                    h.p(
                        [h.Class("text-sm font-medium text-primary")],
                        ["Learn"]
                    ),
                    h.h1(
                        [h.Class("text-3xl font-bold tracking-tight")],
                        [subject.label]
                    ),
                    h.p(
                        [h.Class("max-w-2xl text-muted-foreground")],
                        [
                            `${subject.lessons.length.toString()} lessons on ${subject.label.toLowerCase()}.`,
                        ]
                    ),
                ]
            ),
            ...subject.lessons.map((lesson) =>
                h.keyed("a")(
                    lesson.tag,
                    [h.Href(lesson.href), h.Class(CARD_CLASS)],
                    [
                        lesson.icon({ class: "size-6 text-primary" }),
                        h.h2(
                            [h.Class("text-lg font-semibold")],
                            [lesson.label]
                        ),
                        h.p(
                            [
                                h.Class(
                                    "text-sm leading-6 text-muted-foreground"
                                ),
                            ],
                            [lesson.description]
                        ),
                    ]
                )
            ),
        ]
    )

export const view = <ParentMessage>(
    model: Model,
    learn_path: string,
    to_parent_message: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    if (EffectRunner.isEffectExamplePath(learn_path))
        return h.submodel({
            slotId: "desktop-learn-effect-examples",
            model: model.effect_runner,
            view: EffectRunner.view,
            toParentMessage: (message) =>
                to_parent_message(GotEffectRunnerMessage({ message })),
        })

    const subject = subject_for_path(learn_path)
    if (subject !== undefined) return subject_view(subject, h)

    const content = lesson_view(model, learn_path, to_parent_message, h)
    return content === undefined
        ? index_view(h)
        : h.div([h.Class(LESSON_SHELL_CLASS)], [content])
}
