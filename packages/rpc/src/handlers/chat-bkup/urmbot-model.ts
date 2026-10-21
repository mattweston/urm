import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai"
import { Config, Context, Effect, Layer, Schema } from "effect"
import { LanguageModel } from "effect/unstable/ai"
import { FetchHttpClient } from "effect/unstable/http"

import { DatabaseError } from "@urm/domain/errors"

export type UrmbotLanguageModelPrompt = Readonly<{
    sourceTitle: string
    sourceReference: string
    sourceBody: string
    question: string
    conversationContext: string
}>

export interface UrmbotLanguageModelService {
    answer: (
        prompt: UrmbotLanguageModelPrompt
    ) => Effect.Effect<string, DatabaseError>
}

export class UrmbotLanguageModel extends Context.Service<
    UrmbotLanguageModel,
    UrmbotLanguageModelService
>()("UrmbotLanguageModel") {}

export const UrmbotLanguageModelDemoLive = Layer.succeed(
    UrmbotLanguageModel,
    UrmbotLanguageModel.of({
        answer: () =>
            Effect.succeed(
                "URMBot is unavailable in this demo workspace. Explore the sample content and administration tools instead."
            ),
    })
)

const UrmbotAnswer = Schema.Struct({
    answer: Schema.String,
})

const promptForUrmbot = (
    prompt: UrmbotLanguageModelPrompt
): string => `You are URMBot, a public URM chat assistant.

Use only the approved public chat source below. Do not mention internal files, developer documentation, APIs, implementation details, or unavailable actions. If the source does not answer the question, say so clearly and invite a more specific question.

Recent conversation:
${prompt.conversationContext}

Approved source title: ${prompt.sourceTitle}
Approved source reference: ${prompt.sourceReference}

Approved source content:
${prompt.sourceBody}

Question:
${prompt.question}`

export const UrmbotLanguageModelLive = Layer.unwrap(
    Effect.gen(function* () {
        const apiKey = yield* Config.redacted("OPENAI_API_KEY")
        const model = yield* Config.string("OPENAI_MODEL").pipe(
            Config.withDefault("gpt-4o-mini")
        )
        const clientLayer = OpenAiClient.layer({ apiKey }).pipe(
            Layer.provide(FetchHttpClient.layer)
        )
        const languageModelLayer = OpenAiLanguageModel.layer({ model }).pipe(
            Layer.provide(clientLayer)
        )

        return Layer.effect(
            UrmbotLanguageModel,
            Effect.gen(function* () {
                const languageModel = yield* LanguageModel.LanguageModel

                return UrmbotLanguageModel.of({
                    answer: (prompt) =>
                        languageModel
                            .generateObject({
                                objectName: "urmbot_answer",
                                prompt: promptForUrmbot(prompt),
                                schema: UrmbotAnswer,
                            })
                            .pipe(
                                Effect.map((response) => response.value.answer),
                                Effect.mapError(
                                    () =>
                                        new DatabaseError({
                                            message:
                                                "URMBot could not answer this question.",
                                        })
                                ),
                                Effect.timeoutOrElse({
                                    duration: "20 seconds",
                                    orElse: () =>
                                        Effect.fail(
                                            new DatabaseError({
                                                message:
                                                    "URMBot took too long to respond. Please try again.",
                                            })
                                        ),
                                })
                            ),
                })
            })
        ).pipe(Layer.provide(languageModelLayer))
    })
)
