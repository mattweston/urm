import { BrowserKeyValueStore } from "@effect/platform-browser"
import { Effect, Option, Schema as S } from "effect"
import { KeyValueStore } from "effect/persistence"
import { Command } from "foldkit"

import {
    CompletedSaveTourDates,
    FailedSaveTourDates,
    LoadedTourDates,
} from "./message.ts"
import { TourDateGroup } from "./tour-date.ts"

const STORAGE_KEY = "urm-labs-tour-dates"
const TourDateGroups = S.Array(TourDateGroup)

export const LoadTourDates = Command.define("LoadTourDates", {
    messages: [LoadedTourDates],
    execute: Effect.gen(function* () {
        const store = yield* KeyValueStore.KeyValueStore
        const maybe_json = Option.fromNullishOr(yield* store.get(STORAGE_KEY))
        const maybe_groups = yield* Option.match(maybe_json, {
            onNone: () =>
                Effect.succeed(Option.none<typeof TourDateGroups.Type>()),
            onSome: (json) =>
                S.decodeEffect(S.fromJsonString(TourDateGroups))(json).pipe(
                    Effect.map(Option.some)
                ),
        })
        return LoadedTourDates({ maybe_groups })
    }).pipe(
        Effect.catch(() =>
            Effect.succeed(LoadedTourDates({ maybe_groups: Option.none() }))
        ),
        Effect.provide(BrowserKeyValueStore.layerLocalStorage)
    ),
})

export const SaveTourDates = Command.define("SaveTourDates", {
    args: { groups: TourDateGroups },
    messages: [CompletedSaveTourDates, FailedSaveTourDates],
    execute: ({ groups }) =>
        Effect.gen(function* () {
            const store = yield* KeyValueStore.KeyValueStore
            yield* store.set(
                STORAGE_KEY,
                S.encodeSync(S.fromJsonString(TourDateGroups))(groups)
            )
            return CompletedSaveTourDates()
        }).pipe(
            Effect.catch(() =>
                Effect.succeed(
                    FailedSaveTourDates({
                        error: "Tour dates could not be saved locally.",
                    })
                )
            ),
            Effect.provide(BrowserKeyValueStore.layerLocalStorage)
        ),
})

export const saveTourDates = (groups: typeof TourDateGroups.Type) =>
    SaveTourDates({ groups })
