import { BrowserKeyValueStore } from "@effect/platform-browser"
import {
    Array,
    Duration,
    Effect,
    Option,
    Schema as S,
    String as String_,
    pipe,
} from "effect"
import { KeyValueStore } from "effect/persistence"
import { Command } from "foldkit"
import {
    FailedClearSession,
    FailedSaveSession,
    LoadedSession,
    SucceededClearSession,
    SucceededSaveSession,
    SucceededSimulateAuthRequest,
    FailedSimulateAuthRequest,
} from "./auth.message.ts"
import { Session } from "./auth.session.ts"
import { AuthRoute } from "./auth.route.ts"
import { Session as SessionModel } from "./auth.session.ts"

const SESSION_STORAGE_KEY = "auth_session"

export const LoadSession = Command.define("LoadSession", {
    args: { route: AuthRoute },
    messages: [LoadedSession],
    execute: ({ route }) =>
        Effect.gen(function* () {
            const store = yield* KeyValueStore.KeyValueStore
            const maybeSessionJson = Option.fromNullishOr(
                yield* store.get(SESSION_STORAGE_KEY)
            )

            const session = yield* Option.match(maybeSessionJson, {
                onNone: () => Effect.succeed(Option.none<SessionModel>()),
                onSome: (sessionJson) =>
                    S.decodeEffect(S.fromJsonString(Session))(sessionJson).pipe(
                        Effect.map(Option.some)
                    ),
            })

            return LoadedSession({ session, route })
        }).pipe(
            Effect.catch(() =>
                Effect.succeed(LoadedSession({ session: Option.none(), route }))
            ),
            Effect.provide(BrowserKeyValueStore.layerLocalStorage)
        ),
})
const SaveSession = Command.define("SaveSession", {
    args: { session: SessionModel },
    messages: [SucceededSaveSession, FailedSaveSession],
    execute: ({ session }) =>
        Effect.gen(function* () {
            const store = yield* KeyValueStore.KeyValueStore
            yield* store.set(
                SESSION_STORAGE_KEY,
                S.encodeSync(S.fromJsonString(Session))(session)
            )
            return SucceededSaveSession()
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(FailedSaveSession({ error: String(error) }))
            ),
            Effect.provide(BrowserKeyValueStore.layerLocalStorage)
        ),
})
const SimulateAuthRequest = Command.define("SimulateAuthRequest", {
    args: { password: S.String, email: S.String },
    messages: [SucceededSimulateAuthRequest, FailedSimulateAuthRequest],
    execute: ({ password, email }) =>
        Effect.gen(function* () {
            yield* Effect.sleep(Duration.seconds(1))

            if (password !== "password") {
                return FailedSimulateAuthRequest({
                    error: "Invalid credentials",
                })
            }

            const name = pipe(
                email,
                String_.split("@"),
                Array.head,
                Option.getOrElse(() => email)
            )

            return SucceededSimulateAuthRequest({
                session: {
                    contactId: "1",
                    email,
                    name,
                },
            })
        }),
})

export const saveSession = (session: SessionModel) => SaveSession({ session })
export const ClearSession = Command.define("ClearSession", {
    messages: [SucceededClearSession, FailedClearSession],
    execute: Effect.gen(function* () {
        const store = yield* KeyValueStore.KeyValueStore
        yield* store.remove(SESSION_STORAGE_KEY)
        return SucceededClearSession()
    }).pipe(
        Effect.catch((error) =>
            Effect.succeed(FailedClearSession({ error: String(error) }))
        ),
        Effect.provide(BrowserKeyValueStore.layerLocalStorage)
    ),
})

export const simulateAuthRequest = (email: string, password: string) =>
    SimulateAuthRequest({ password, email })
