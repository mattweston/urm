import { Match as M, Option } from "effect"
import {
    Invalid,
    NotValidated,
    allValid,
    makeRules,
    validate,
} from "foldkit/fieldValidation"
import { Rule } from "foldkit/fieldValidation"
import { Command } from "foldkit"
import { modifyFields } from "foldkit/struct"
import {
    ClearSession,
    LoadSession,
    saveSession,
    simulateAuthRequest,
} from "./auth.command.ts"
import type { Message, OutMessage } from "./auth.message.ts"
import { RequestedRedirect } from "./auth.message.ts"
import type {
    LoggedIn as LoggedInModel,
    LoggedOut as LoggedOutModel,
    LoginModel,
    Model,
} from "./auth.model.ts"
import { LoggedIn, LoggedOut } from "./auth.model.ts"
import type { AuthRoute } from "./auth.route.ts"
import {
    AuthDashboardRoute,
    AuthHomeRoute,
    AuthLoginRoute,
    type LoggedInRoute,
    type LoggedOutRoute,
} from "./auth.route.ts"
import type { Session } from "./auth.session.ts"

type UpdateReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<Message>>,
    Option.Option<OutMessage>,
]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

const emailRules = makeRules({
    required: "Email is required",
    rules: [Rule.email("Please enter a valid email")],
})

const passwordRules = makeRules({
    required: "Password is required",
})

const validateEmail = validate(emailRules)
const validatePassword = validate(passwordRules)

const initLoginModel = (): LoginModel => ({
    email: NotValidated({ value: "" }),
    password: NotValidated({ value: "" }),
    isSubmitting: false,
})

const isFormValid = (loginModel: LoginModel): boolean =>
    allValid([
        [loginModel.email, emailRules],
        [loginModel.password, passwordRules],
    ])

const loggedOutRouteFrom = (route: AuthRoute): LoggedOutRoute =>
    M.value(route).pipe(
        M.withReturnType<LoggedOutRoute>(),
        M.tagsExhaustive({
            AuthHome: (authRoute) => authRoute,
            AuthLogin: (authRoute) => authRoute,
            AuthNotFound: (authRoute) => authRoute,
            AuthDashboard: () => AuthLoginRoute(),
            AuthSettings: () => AuthLoginRoute(),
        })
    )

const loggedInRouteFrom = (route: AuthRoute): LoggedInRoute =>
    M.value(route).pipe(
        M.withReturnType<LoggedInRoute>(),
        M.tagsExhaustive({
            AuthDashboard: (authRoute) => authRoute,
            AuthSettings: (authRoute) => authRoute,
            AuthNotFound: (authRoute) => authRoute,
            AuthHome: () => AuthDashboardRoute(),
            AuthLogin: () => AuthDashboardRoute(),
        })
    )

const makeLoggedOutModel = (route: AuthRoute, loginModel = initLoginModel()) =>
    LoggedOut({
        route: loggedOutRouteFrom(route),
        loginModel,
    })

const makeLoggedInModel = (route: AuthRoute, session: Session) =>
    LoggedIn({
        route: loggedInRouteFrom(route),
        session,
    })

const noOutMessage = Option.none<OutMessage>()

const redirectTo = (route: typeof RequestedRedirect.fields.route.Type) =>
    Option.some(RequestedRedirect({ route }))

const syncLoggedOutRoute = (
    model: LoggedOutModel,
    route: AuthRoute
): UpdateReturn =>
    M.value(route).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            AuthHome: (authRoute) => [
                modifyFields(model, { route: () => authRoute }),
                [],
                noOutMessage,
            ],
            AuthLogin: (authRoute) => [
                modifyFields(model, { route: () => authRoute }),
                [],
                noOutMessage,
            ],
            AuthNotFound: (authRoute) => [
                modifyFields(model, { route: () => authRoute }),
                [],
                noOutMessage,
            ],
            AuthDashboard: () => [
                modifyFields(model, { route: () => AuthLoginRoute() }),
                [],
                redirectTo(AuthLoginRoute()),
            ],
            AuthSettings: () => [
                modifyFields(model, { route: () => AuthLoginRoute() }),
                [],
                redirectTo(AuthLoginRoute()),
            ],
        })
    )

const syncLoggedInRoute = (
    model: LoggedInModel,
    route: AuthRoute
): UpdateReturn =>
    M.value(route).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            AuthDashboard: (authRoute) => [
                modifyFields(model, { route: () => authRoute }),
                [],
                noOutMessage,
            ],
            AuthSettings: (authRoute) => [
                modifyFields(model, { route: () => authRoute }),
                [],
                noOutMessage,
            ],
            AuthNotFound: (authRoute) => [
                modifyFields(model, { route: () => authRoute }),
                [],
                noOutMessage,
            ],
            AuthHome: () => [model, [], redirectTo(AuthDashboardRoute())],
            AuthLogin: () => [model, [], redirectTo(AuthDashboardRoute())],
        })
    )

export const init = (
    route: AuthRoute
): readonly [Model, ReadonlyArray<Command.Command<Message>>] => [
    makeLoggedOutModel(route),
    [LoadSession({ route })],
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            ChangedRoute: ({ route }) =>
                M.value(model).pipe(
                    withUpdateReturn,
                    M.tagsExhaustive({
                        LoggedOut: (loggedOutModel) =>
                            syncLoggedOutRoute(loggedOutModel, route),
                        LoggedIn: (loggedInModel) =>
                            syncLoggedInRoute(loggedInModel, route),
                    })
                ),
            LoadedSession: ({ session, route }) =>
                Option.match(session, {
                    onNone: () =>
                        M.value(route).pipe(
                            withUpdateReturn,
                            M.tagsExhaustive({
                                AuthHome: () => [
                                    makeLoggedOutModel(route),
                                    [],
                                    noOutMessage,
                                ],
                                AuthLogin: () => [
                                    makeLoggedOutModel(route),
                                    [],
                                    noOutMessage,
                                ],
                                AuthNotFound: () => [
                                    makeLoggedOutModel(route),
                                    [],
                                    noOutMessage,
                                ],
                                AuthDashboard: () => [
                                    makeLoggedOutModel(AuthLoginRoute()),
                                    [],
                                    redirectTo(AuthLoginRoute()),
                                ],
                                AuthSettings: () => [
                                    makeLoggedOutModel(AuthLoginRoute()),
                                    [],
                                    redirectTo(AuthLoginRoute()),
                                ],
                            })
                        ),
                    onSome: (loadedSession) =>
                        M.value(route).pipe(
                            withUpdateReturn,
                            M.tagsExhaustive({
                                AuthHome: () => [
                                    makeLoggedInModel(
                                        AuthDashboardRoute(),
                                        loadedSession
                                    ),
                                    [],
                                    redirectTo(AuthDashboardRoute()),
                                ],
                                AuthLogin: () => [
                                    makeLoggedInModel(
                                        AuthDashboardRoute(),
                                        loadedSession
                                    ),
                                    [],
                                    redirectTo(AuthDashboardRoute()),
                                ],
                                AuthDashboard: () => [
                                    makeLoggedInModel(route, loadedSession),
                                    [],
                                    noOutMessage,
                                ],
                                AuthSettings: () => [
                                    makeLoggedInModel(route, loadedSession),
                                    [],
                                    noOutMessage,
                                ],
                                AuthNotFound: () => [
                                    makeLoggedInModel(route, loadedSession),
                                    [],
                                    noOutMessage,
                                ],
                            })
                        ),
                }),
            ChangedEmail: ({ value }) =>
                M.value(model).pipe(
                    withUpdateReturn,
                    M.tagsExhaustive({
                        LoggedOut: (loggedOutModel) => [
                            modifyFields(loggedOutModel, {
                                loginModel: (loginModel) =>
                                    modifyFields(loginModel, {
                                        email: () => validateEmail(value),
                                    }),
                            }),
                            [],
                            noOutMessage,
                        ],
                        LoggedIn: () => [model, [], noOutMessage],
                    })
                ),
            ChangedPassword: ({ value }) =>
                M.value(model).pipe(
                    withUpdateReturn,
                    M.tagsExhaustive({
                        LoggedOut: (loggedOutModel) => [
                            modifyFields(loggedOutModel, {
                                loginModel: (loginModel) =>
                                    modifyFields(loginModel, {
                                        password: () => validatePassword(value),
                                    }),
                            }),
                            [],
                            noOutMessage,
                        ],
                        LoggedIn: () => [model, [], noOutMessage],
                    })
                ),
            SubmittedForm: () =>
                M.value(model).pipe(
                    withUpdateReturn,
                    M.tagsExhaustive({
                        LoggedOut: (loggedOutModel) => {
                            if (!isFormValid(loggedOutModel.loginModel)) {
                                return [model, [], noOutMessage]
                            }

                            return [
                                modifyFields(loggedOutModel, {
                                    loginModel: (loginModel) =>
                                        modifyFields(loginModel, {
                                            isSubmitting: () => true,
                                        }),
                                }),
                                [
                                    simulateAuthRequest(
                                        loggedOutModel.loginModel.email.value,
                                        loggedOutModel.loginModel.password.value
                                    ),
                                ],
                                noOutMessage,
                            ]
                        },
                        LoggedIn: () => [model, [], noOutMessage],
                    })
                ),
            SucceededSimulateAuthRequest: ({ session }) => [
                makeLoggedInModel(AuthDashboardRoute(), session),
                [saveSession(session)],
                redirectTo(AuthDashboardRoute()),
            ],
            FailedSimulateAuthRequest: ({ error }) =>
                M.value(model).pipe(
                    withUpdateReturn,
                    M.tagsExhaustive({
                        LoggedOut: (loggedOutModel) => [
                            modifyFields(loggedOutModel, {
                                loginModel: (loginModel) =>
                                    modifyFields(loginModel, {
                                        password: () =>
                                            Invalid({
                                                value: loginModel.password
                                                    .value,
                                                errors: [error],
                                            }),
                                        isSubmitting: () => false,
                                    }),
                            }),
                            [],
                            noOutMessage,
                        ],
                        LoggedIn: () => [model, [], noOutMessage],
                    })
                ),
            ClickedLogout: () => [
                makeLoggedOutModel(AuthHomeRoute()),
                [ClearSession()],
                redirectTo(AuthHomeRoute()),
            ],
            SucceededSaveSession: () => [model, [], noOutMessage],
            FailedSaveSession: () => [model, [], noOutMessage],
            SucceededClearSession: () => [model, [], noOutMessage],
            FailedClearSession: () => [model, [], noOutMessage],
        })
    )
