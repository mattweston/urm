import { BrowserCrypto, BrowserKeyValueStore } from "@effect/platform-browser"
import { Crypto, Effect, Option, Schema as S } from "effect"
import { KeyValueStore } from "effect/persistence"
import { Command, Dom } from "foldkit"
import { ADD_CARD_INPUT_ID, STORAGE_KEY } from "./kanban.constant.ts"
import { Column } from "./kanban.column.ts"
import {
    CompletedFocusAddCardInput,
    CompletedSaveBoard,
    GeneratedCardId,
    LoadedBoard,
} from "./kanban.message.ts"
import { SavedBoard } from "./kanban.model.ts"

const Columns = S.Array(Column)

const GenerateCardId = Command.define("GenerateCardId", {
    args: { columnId: S.String, title: S.String },
    messages: [GeneratedCardId],
    execute: ({ columnId, title }) =>
        Effect.gen(function* () {
            const crypto = yield* Crypto.Crypto
            const cardId = yield* Effect.orDie(crypto.randomUUIDv4)
            return GeneratedCardId({ cardId, columnId, title })
        }).pipe(Effect.provide(BrowserCrypto.layer)),
})
const SaveBoard = Command.define("SaveBoard", {
    args: { columns: Columns },
    messages: [CompletedSaveBoard],
    execute: ({ columns }) =>
        Effect.gen(function* () {
            const store = yield* KeyValueStore.KeyValueStore
            yield* store.set(
                STORAGE_KEY,
                S.encodeSync(S.fromJsonString(SavedBoard))({ columns })
            )
            return CompletedSaveBoard()
        }).pipe(
            Effect.catch(() => Effect.succeed(CompletedSaveBoard())),
            Effect.provide(BrowserKeyValueStore.layerLocalStorage)
        ),
})

export const FocusAddCardInput = Command.define("FocusAddCardInput", {
    messages: [CompletedFocusAddCardInput],
    execute: Dom.focus(`#${ADD_CARD_INPUT_ID}`).pipe(
        Effect.ignore,
        Effect.as(CompletedFocusAddCardInput())
    ),
})

export const generateCardId = (columnId: string, title: string) =>
    GenerateCardId({ columnId, title })
export const LoadBoard = Command.define("LoadBoard", {
    messages: [LoadedBoard],
    execute: Effect.gen(function* () {
        const store = yield* KeyValueStore.KeyValueStore
        const maybeSavedBoardJson = Option.fromNullishOr(
            yield* store.get(STORAGE_KEY)
        )

        const maybeSavedBoard = yield* Option.match(maybeSavedBoardJson, {
            onNone: () => Effect.succeed(Option.none<typeof SavedBoard.Type>()),
            onSome: (json) =>
                S.decodeEffect(S.fromJsonString(SavedBoard))(json).pipe(
                    Effect.map(Option.some)
                ),
        })

        return LoadedBoard({ maybeSavedBoard })
    }).pipe(
        Effect.catch(() =>
            Effect.succeed(LoadedBoard({ maybeSavedBoard: Option.none() }))
        ),
        Effect.provide(BrowserKeyValueStore.layerLocalStorage)
    ),
})

export const saveBoard = (columns: typeof Columns.Type) =>
    SaveBoard({ columns })
