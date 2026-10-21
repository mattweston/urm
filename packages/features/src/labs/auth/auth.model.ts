import { Schema as S } from "effect"
import { Field } from "foldkit/fieldValidation"
import { taggedStruct } from "foldkit/schema"
import { LoggedInRoute, LoggedOutRoute } from "./auth.route.ts"
import { Session } from "./auth.session.ts"

export const LoginModel = S.Struct({
    email: Field(S.String),
    password: Field(S.String),
    isSubmitting: S.Boolean,
})

export type LoginModel = typeof LoginModel.Type

export const LoggedOut = taggedStruct("LoggedOut", {
    route: LoggedOutRoute,
    loginModel: LoginModel,
})

export type LoggedOut = typeof LoggedOut.Type

export const LoggedIn = taggedStruct("LoggedIn", {
    route: LoggedInRoute,
    session: Session,
})

export type LoggedIn = typeof LoggedIn.Type

export const Model = S.Union([LoggedOut, LoggedIn])

export type Model = typeof Model.Type
