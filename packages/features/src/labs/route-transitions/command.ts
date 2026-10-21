import { Duration, Effect, Schema as S } from "effect"
import { Command } from "foldkit"

import {
    SucceededLoadRtCatalog,
    SucceededLoadRtPainting,
    SucceededSaveRtDraft,
} from "./message.ts"

const CATALOG_LATENCY = Duration.millis(600)
const PAINTING_LATENCY = Duration.millis(400)
const SAVE_LATENCY = Duration.millis(300)

export const LoadRtCatalog = Command.define("LoadRtCatalog", {
    messages: [SucceededLoadRtCatalog],
    execute: Effect.sleep(CATALOG_LATENCY).pipe(
        Effect.as(SucceededLoadRtCatalog())
    ),
})

export const LoadRtPainting = Command.define("LoadRtPainting", {
    args: { paintingId: S.Number },
    messages: [SucceededLoadRtPainting],
    execute: ({ paintingId }) =>
        Effect.sleep(PAINTING_LATENCY).pipe(
            Effect.as(SucceededLoadRtPainting({ paintingId }))
        ),
})

export const SaveRtDraft = Command.define("SaveRtDraft", {
    args: { draft: S.String },
    messages: [SucceededSaveRtDraft],
    execute: ({ draft }) =>
        Effect.sleep(SAVE_LATENCY).pipe(
            Effect.as(SucceededSaveRtDraft({ draft }))
        ),
})
