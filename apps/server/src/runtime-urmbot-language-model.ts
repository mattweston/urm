import { loadEnvironmentConfig } from "@urm/db/config"
import {
    UrmbotLanguageModelDemoLive,
    UrmbotLanguageModelLive,
} from "@urm/rpc/handlers/chat-bkup"
import { Effect, Layer } from "effect"

/** Chooses the deterministic chat model for every demo process at startup. */
export const RuntimeUrmbotLanguageModelLive = Layer.unwrap(
    loadEnvironmentConfig.pipe(
        Effect.map((environment) =>
            environment.is_demo
                ? UrmbotLanguageModelDemoLive
                : UrmbotLanguageModelLive
        )
    )
)
