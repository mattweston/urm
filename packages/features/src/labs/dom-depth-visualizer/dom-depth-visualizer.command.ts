import { BrowserKeyValueStore } from "@effect/platform-browser"
import { Effect, Option, Schema as S } from "effect"
import { KeyValueStore } from "effect/unstable/persistence"
import { Command } from "foldkit"
import {
    CompletedSavePreference,
    LoadedPreference,
} from "./dom-depth-visualizer.message.ts"

const STORAGE_KEY = "design.dom-depth-visualizer.is-active"
const PreferenceJson = S.fromJsonString(S.Boolean)
const SavePreference = Command.define("SavePreference", {
    args: { isActive: S.Boolean },
    messages: [CompletedSavePreference],
    execute: ({ isActive }) =>
        Effect.gen(function* () {
            const store = yield* KeyValueStore.KeyValueStore
            yield* store.set(
                STORAGE_KEY,
                S.encodeSync(PreferenceJson)(isActive)
            )

            return CompletedSavePreference()
        }).pipe(
            Effect.catch(() => Effect.succeed(CompletedSavePreference())),
            Effect.provide(BrowserKeyValueStore.layerLocalStorage)
        ),
})
export const LoadPreference = Command.define("LoadPreference", {
    messages: [LoadedPreference],
    execute: Effect.gen(function* () {
        const store = yield* KeyValueStore.KeyValueStore
        const maybePreferenceJson = Option.fromNullishOr(
            yield* store.get(STORAGE_KEY)
        )

        const isActive = yield* Option.match(maybePreferenceJson, {
            onNone: () => Effect.succeed(false),
            onSome: (preferenceJson) =>
                S.decodeEffect(PreferenceJson)(preferenceJson),
        })

        return LoadedPreference({ isActive })
    }).pipe(
        Effect.catch(() =>
            Effect.succeed(LoadedPreference({ isActive: false }))
        ),
        Effect.provide(BrowserKeyValueStore.layerLocalStorage)
    ),
})

export const savePreference = (isActive: boolean) =>
    SavePreference({ isActive })
