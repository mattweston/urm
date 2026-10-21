import { Option, Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import {
    AuthDashboardRoute,
    AuthHomeRoute,
    AuthLoginRoute,
    AuthRoute,
} from "./auth.route.ts"
import { Session } from "./auth.session.ts"

export const ChangedRoute = taggedStruct("ChangedRoute", { route: AuthRoute })
export const LoadedSession = taggedStruct("LoadedSession", {
    session: S.Option(Session),
    route: AuthRoute,
})
export const ChangedEmail = taggedStruct("ChangedEmail", { value: S.String })
export const ChangedPassword = taggedStruct("ChangedPassword", {
    value: S.String,
})
export const SubmittedForm = taggedStruct("SubmittedForm")
export const SucceededSimulateAuthRequest = taggedStruct(
    "SucceededSimulateAuthRequest",
    {
        session: Session,
    }
)
export const FailedSimulateAuthRequest = taggedStruct(
    "FailedSimulateAuthRequest",
    {
        error: S.String,
    }
)
export const ClickedLogout = taggedStruct("ClickedLogout")
export const SucceededSaveSession = taggedStruct("SucceededSaveSession")
export const FailedSaveSession = taggedStruct("FailedSaveSession", {
    error: S.String,
})
export const SucceededClearSession = taggedStruct("SucceededClearSession")
export const FailedClearSession = taggedStruct("FailedClearSession", {
    error: S.String,
})

export const Message = S.Union([
    ChangedRoute,
    LoadedSession,
    ChangedEmail,
    ChangedPassword,
    SubmittedForm,
    SucceededSimulateAuthRequest,
    FailedSimulateAuthRequest,
    ClickedLogout,
    SucceededSaveSession,
    FailedSaveSession,
    SucceededClearSession,
    FailedClearSession,
])

export type Message = typeof Message.Type

const RedirectRoute = S.Union([
    AuthHomeRoute,
    AuthLoginRoute,
    AuthDashboardRoute,
])

export const RequestedRedirect = taggedStruct("RequestedRedirect", {
    route: RedirectRoute,
})

export const OutMessage = S.Union([RequestedRedirect])

export type OutMessage = typeof OutMessage.Type

export const noOutMessage = Option.none<OutMessage>()
