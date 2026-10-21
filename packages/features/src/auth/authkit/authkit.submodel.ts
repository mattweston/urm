import * as Effect from "effect/Effect"
import * as Match from "effect/Match"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as Ui from "@foldkit/ui"
import { AccountMenu } from "@urm/ui/foldkit/auth-control.view.ts"
import { Command } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"

import { initial, Model, Profile } from "./authkit.model.ts"
import { Service } from "./authkit.service.ts"

export const AuthKitLoaded = taggedStruct("AuthKitLoaded", {
    profile: Schema.Option(Profile),
})
export const AuthKitFailed = taggedStruct("AuthKitFailed", {
    details: Schema.String,
})
export const AuthKitClickedSignIn = taggedStruct("AuthKitClickedSignIn")
export const AuthKitClickedSignOut = taggedStruct("AuthKitClickedSignOut")
export const AuthKitSignedOut = taggedStruct("AuthKitSignedOut")
export const GotAccountMenuMessage = taggedStruct("GotAccountMenuMessage", {
    message: Ui.Menu.Message,
})

export const Message = Schema.Union([
    AuthKitLoaded,
    AuthKitFailed,
    AuthKitClickedSignIn,
    AuthKitClickedSignOut,
    AuthKitSignedOut,
    GotAccountMenuMessage,
])
export type Message = typeof Message.Type

const error_message = (error: unknown): string =>
    error instanceof Error ? error.message : globalThis.String(error)

const LoadAuthKit = Command.define("LoadAuthKit", {
    messages: [AuthKitLoaded, AuthKitFailed],
    execute: Effect.gen(function* () {
        const auth = yield* Service
        return yield* auth.load().pipe(
            Effect.match({
                onFailure: (error) =>
                    AuthKitFailed({ details: error_message(error.cause) }),
                onSuccess: (profile) => AuthKitLoaded({ profile }),
            })
        )
    }),
})

const SignInWithAuthKit = Command.define("SignInWithAuthKit", {
    messages: [AuthKitFailed],
    execute: Effect.gen(function* () {
        const auth = yield* Service
        return yield* auth.sign_in().pipe(
            Effect.as(AuthKitFailed({ details: "Sign-in did not redirect" })),
            Effect.catch((error) =>
                Effect.succeed(
                    AuthKitFailed({ details: error_message(error.cause) })
                )
            )
        )
    }),
})

const SignOutWithAuthKit = Command.define("SignOutWithAuthKit", {
    messages: [AuthKitSignedOut, AuthKitFailed],
    execute: Effect.gen(function* () {
        const auth = yield* Service
        return yield* auth.sign_out().pipe(
            Effect.as(AuthKitSignedOut()),
            Effect.catch((error) =>
                Effect.succeed(
                    AuthKitFailed({ details: error_message(error.cause) })
                )
            )
        )
    }),
})

export type UpdateReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<Message, never, Service>>,
]

export const init = (): UpdateReturn => [initial, [LoadAuthKit()]]

export const update = (model: Model, message: Message): UpdateReturn =>
    Match.value(message).pipe(
        Match.withReturnType<UpdateReturn>(),
        Match.tagsExhaustive({
            AuthKitLoaded: ({ profile }) => [
                modifyFields(model, {
                    status: () =>
                        Option.isSome(profile) ? "signed_in" : "signed_out",
                    profile: () => profile,
                    error: () => Option.none(),
                }),
                [],
            ],
            AuthKitFailed: ({ details }) => [
                modifyFields(model, {
                    status: () => "error",
                    error: () => Option.some(details),
                }),
                [],
            ],
            AuthKitClickedSignIn: () => [
                modifyFields(model, {
                    status: () => "loading",
                    error: () => Option.none(),
                }),
                [SignInWithAuthKit()],
            ],
            AuthKitClickedSignOut: () => [
                modifyFields(model, {
                    status: () => "loading",
                    error: () => Option.none(),
                }),
                [SignOutWithAuthKit()],
            ],
            AuthKitSignedOut: () => [
                modifyFields(model, {
                    status: () => "signed_out",
                    profile: () => Option.none(),
                    error: () => Option.none(),
                }),
                [],
            ],
            GotAccountMenuMessage: ({ message: child_message }) => {
                const {
                    model: account_menu,
                    commands = [],
                    outMessage: maybe_output_value,
                } = AccountMenu.update(model.account_menu, child_message)
                const maybe_output = Option.fromUndefinedOr(maybe_output_value)
                const mapped_commands = Command.mapMessages(
                    commands,
                    (message) => GotAccountMenuMessage({ message })
                )

                return Option.match(maybe_output, {
                    onNone: () => [
                        modifyFields(model, {
                            account_menu: () => account_menu,
                        }),
                        mapped_commands,
                    ],
                    onSome: () => [
                        modifyFields(model, {
                            account_menu: () => account_menu,
                            status: () => "loading",
                            error: () => Option.none(),
                        }),
                        [...mapped_commands, SignOutWithAuthKit()],
                    ],
                })
            },
        })
    )
