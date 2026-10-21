import { Array, Match as M } from "effect"
import { allValid, makeRules, Rule } from "foldkit/fieldValidation"
import type { Field } from "foldkit/fieldValidation"
import type { Html, HtmlBuilder } from "foldkit/html"
import {
    IconBrandGithub,
    IconBrandGoogle,
    IconLoader,
} from "@urm/ui/foldkit/icons/view.ts"
import { Button } from "@urm/ui/foldkit/button/button.view.ts"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@urm/ui/foldkit/card.view.ts"
import { Grid } from "@urm/ui/foldkit/grid.view.ts"
import {
    TextField,
    TextFieldInput,
    TextFieldLabel,
} from "@urm/ui/foldkit/text-field.view.ts"
import type { Message } from "./auth.message.ts"
import {
    ChangedRoute,
    ChangedEmail,
    ChangedPassword,
    ClickedLogout,
    SubmittedForm,
} from "./auth.message.ts"
import type { LoginModel, Model } from "./auth.model.ts"
import {
    AuthDashboardRoute,
    AuthHomeRoute,
    AuthLoginRoute,
    AuthSettingsRoute,
} from "./auth.route.ts"
import type { Session } from "./auth.session.ts"

export type Hrefs = Readonly<{
    home: string
    login: string
    dashboard: string
    settings: string
}>

const navigationLinkClassName = (isActive: boolean) =>
    isActive
        ? "bg-accent text-accent-foreground font-medium px-3 py-1 rounded transition border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground font-medium px-3 py-1 rounded transition border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"

const emailRules = makeRules({
    required: "Email is required",
    rules: [Rule.email("Please enter a valid email")],
})

const passwordRules = makeRules({
    required: "Password is required",
})

const isFormValid = (loginModel: LoginModel): boolean =>
    allValid([
        [loginModel.email, emailRules],
        [loginModel.password, passwordRules],
    ])

const fieldErrorView = <ParentMessage>(
    field: Field<string>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return M.value(field).pipe(
        M.tagsExhaustive({
            NotValidated: () => h.empty,
            Validating: () => h.empty,
            Valid: () => h.empty,
            Invalid: ({ errors }) =>
                h.div(
                    [h.Class("text-destructive text-sm mt-1")],
                    [Array.headNonEmpty(errors)]
                ),
        })
    )
}

const fieldView = <ParentMessage>(
    id: string,
    labelText: string,
    field: Field<string>,
    onUpdate: (value: string) => ParentMessage,
    h: HtmlBuilder<ParentMessage>,
    type: "text" | "email" | "password" = "text",
    placeholder = "",
    autocomplete?: string
): Html => {
    return TextField({
        class: "gap-1",
        children: [
            TextFieldLabel({
                for: id,
                class: "sr-only",
                children: [labelText],
            }),
            TextFieldInput(
                {
                    id,
                    field,
                    onInput: onUpdate,
                    type,
                    placeholder,
                    ...((autocomplete ??
                        (type === "email"
                            ? "email"
                            : type === "password"
                              ? "current-password"
                              : undefined)) === undefined
                        ? {}
                        : {
                              autocomplete:
                                  autocomplete ??
                                  (type === "email"
                                      ? "email"
                                      : "current-password"),
                          }),
                },
                h
            ),
            fieldErrorView<ParentMessage>(field, h),
        ],
    })
}

const homeView = <ParentMessage>(
    hrefs: Hrefs,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("max-w-4xl mx-auto px-4")],
        [
            h.div(
                [h.Class("text-center py-16")],
                [
                    h.h1(
                        [h.Class("text-5xl font-bold text-foreground mb-6")],
                        ["Welcome to Auth Example"]
                    ),
                    h.p(
                        [h.Class("text-xl text-muted-foreground mb-8")],
                        ["A demonstration of authentication with Foldkit."]
                    ),
                    h.a(
                        [
                            h.Href(hrefs.login),
                            h.OnClick(
                                toParentMessage(
                                    ChangedRoute({ route: AuthLoginRoute() })
                                )
                            ),
                            h.Class(
                                "inline-block px-8 py-3 bg-primary text-primary-foreground font-medium rounded-[var(--radius-control)] hover:bg-primary/90 transition border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                            ),
                        ],
                        ["Sign In"]
                    ),
                ]
            ),
            h.div(
                [h.Class("grid grid-cols-1 md:grid-cols-3 gap-8 mt-16")],
                [
                    featureCard<ParentMessage>(
                        "Model as Union",
                        "Auth state flips between LoggedOut and LoggedIn instead of juggling optional session state in the view.",
                        h
                    ),
                    featureCard<ParentMessage>(
                        "Route Guards",
                        "Protected routes redirect to login, and auth-only public pages redirect back to the dashboard when already signed in.",
                        h
                    ),
                    featureCard<ParentMessage>(
                        "Session Persistence",
                        "Session survives client-side navigation and can restore from localStorage.",
                        h
                    ),
                ]
            ),
        ]
    )
}

const featureCard = <ParentMessage>(
    title: string,
    description: string,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6 text-card-foreground [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.h2(
                [h.Class("text-xl font-semibold text-foreground mb-3")],
                [title]
            ),
            h.p([h.Class("text-muted-foreground")], [description]),
        ]
    )
}

const loginView = <ParentMessage>(
    loginModel: LoginModel,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const canSubmit = isFormValid(loginModel) && !loginModel.isSubmitting
    const submittingIcon = IconLoader({ class: "mr-2 size-4 animate-spin" })
    const githubIcon = loginModel.isSubmitting
        ? submittingIcon
        : IconBrandGithub({ class: "mr-2 size-4" })
    const googleIcon = loginModel.isSubmitting
        ? submittingIcon
        : IconBrandGoogle({ class: "mr-2 size-4" })

    return h.div(
        [h.Class("mx-auto grid max-w-md gap-6 px-4")],
        [
            Card({
                class: "overflow-hidden",
                children: [
                    CardHeader({
                        children: [
                            CardTitle({ children: ["Sign in"] }),
                            CardDescription({
                                children: [
                                    'Use any email and password "password".',
                                ],
                            }),
                        ],
                    }),
                    CardContent({
                        children: [
                            h.div(
                                [h.Class("grid gap-6")],
                                [
                                    h.form(
                                        [
                                            h.OnSubmit(
                                                toParentMessage(SubmittedForm())
                                            ),
                                        ],
                                        [
                                            Grid({
                                                class: "gap-4",
                                                children: [
                                                    fieldView<ParentMessage>(
                                                        "email",
                                                        "Email",
                                                        loginModel.email,
                                                        (value) =>
                                                            toParentMessage(
                                                                ChangedEmail({
                                                                    value,
                                                                })
                                                            ),
                                                        h,
                                                        "email",
                                                        "me@email.com"
                                                    ),
                                                    fieldView<ParentMessage>(
                                                        "password",
                                                        "Password",
                                                        loginModel.password,
                                                        (value) =>
                                                            toParentMessage(
                                                                ChangedPassword(
                                                                    { value }
                                                                )
                                                            ),
                                                        h,
                                                        "password",
                                                        "••••••••"
                                                    ),
                                                    Button(
                                                        {
                                                            type: "submit",
                                                            disabled:
                                                                !canSubmit,
                                                            class: "w-full",
                                                            children: [
                                                                ...(loginModel.isSubmitting
                                                                    ? [
                                                                          submittingIcon,
                                                                      ]
                                                                    : []),
                                                                loginModel.isSubmitting
                                                                    ? "Signing in..."
                                                                    : "Login",
                                                            ],
                                                        },
                                                        h
                                                    ),
                                                ],
                                            }),
                                        ]
                                    ),
                                    h.div(
                                        [h.Class("relative")],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "absolute inset-0 flex items-center"
                                                    ),
                                                ],
                                                [
                                                    h.span(
                                                        [
                                                            h.Class(
                                                                "w-full border-t-(length:--surface-border-width) border-border"
                                                            ),
                                                        ],
                                                        []
                                                    ),
                                                ]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "relative flex justify-center text-xs uppercase"
                                                    ),
                                                ],
                                                [
                                                    h.span(
                                                        [
                                                            h.Class(
                                                                "bg-background px-2 text-muted-foreground"
                                                            ),
                                                        ],
                                                        ["Or continue with"]
                                                    ),
                                                ]
                                            ),
                                        ]
                                    ),
                                    Button(
                                        {
                                            variant: "outline",
                                            type: "button",
                                            disabled: loginModel.isSubmitting,
                                            class: "w-full",
                                            children: [githubIcon, "Github"],
                                        },
                                        h
                                    ),
                                    Button(
                                        {
                                            variant: "outline",
                                            type: "button",
                                            disabled: loginModel.isSubmitting,
                                            class: "w-full",
                                            children: [googleIcon, "Google"],
                                        },
                                        h
                                    ),
                                ]
                            ),
                        ],
                    }),
                ],
            }),
        ]
    )
}

const dashboardView = <ParentMessage>(
    name: string,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("max-w-4xl mx-auto px-4")],
        [
            h.h1(
                [h.Class("text-4xl font-bold text-foreground mb-6")],
                [`Welcome back, ${name}!`]
            ),
            h.p(
                [h.Class("text-lg text-muted-foreground mb-8")],
                ["Here is your dashboard."]
            ),
            h.div(
                [h.Class("grid grid-cols-1 md:grid-cols-3 gap-6")],
                [
                    statCard<ParentMessage>("Total Sessions", "42", h),
                    statCard<ParentMessage>("Active Projects", "7", h),
                    statCard<ParentMessage>("Tasks Completed", "128", h),
                ]
            ),
        ]
    )
}

const statCard = <ParentMessage>(
    title: string,
    value: string,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6 text-card-foreground [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.h2(
                [
                    h.Class(
                        "text-sm font-medium text-muted-foreground uppercase mb-1"
                    ),
                ],
                [title]
            ),
            h.p([h.Class("text-3xl font-bold text-foreground")], [value]),
        ]
    )
}

const settingsView = <ParentMessage>(
    session: Session,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("max-w-4xl mx-auto px-4")],
        [
            h.h1(
                [h.Class("text-4xl font-bold text-foreground mb-6")],
                ["Settings"]
            ),
            h.div(
                [
                    h.Class(
                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6 text-card-foreground [box-shadow:var(--shadow-surface)] mb-6"
                    ),
                ],
                [
                    h.h2(
                        [h.Class("text-xl font-semibold text-foreground mb-4")],
                        ["Account Information"]
                    ),
                    h.div(
                        [h.Class("space-y-4")],
                        [
                            infoRow<ParentMessage>(
                                "Contact ID",
                                session.contactId,
                                h
                            ),
                            infoRow<ParentMessage>("Email", session.email, h),
                            infoRow<ParentMessage>("Name", session.name, h),
                        ]
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6 text-card-foreground [box-shadow:var(--shadow-surface)]"
                    ),
                ],
                [
                    h.h2(
                        [h.Class("text-xl font-semibold text-foreground mb-4")],
                        ["Actions"]
                    ),
                    h.button(
                        [
                            h.OnClick(toParentMessage(ClickedLogout())),
                            h.Class(
                                "px-6 py-3 bg-destructive text-destructive-foreground font-medium rounded-[var(--radius-control)] hover:bg-destructive/90 transition cursor-pointer border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
                            ),
                        ],
                        ["Sign Out"]
                    ),
                ]
            ),
        ]
    )
}

const infoRow = <ParentMessage>(
    label: string,
    value: string,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [
            h.Class(
                "flex justify-between items-center py-2 border-b-(length:--surface-border-width) border-border"
            ),
        ],
        [
            h.p([h.Class("text-muted-foreground")], [label]),
            h.p([h.Class("font-medium text-foreground")], [value]),
        ]
    )
}

const loggedInNavigationView = <ParentMessage>(
    currentRouteTag: string,
    email: string,
    hrefs: Hrefs,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.nav(
        [
            h.Class(
                "border-b-(length:--surface-border-width) border-border bg-card text-card-foreground p-4"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "max-w-4xl mx-auto flex justify-between items-center"
                    ),
                ],
                [
                    h.ul(
                        [h.Class("flex gap-6 list-none")],
                        [
                            h.li(
                                [],
                                [
                                    h.a(
                                        [
                                            h.Href(hrefs.dashboard),
                                            h.OnClick(
                                                toParentMessage(
                                                    ChangedRoute({
                                                        route: AuthDashboardRoute(),
                                                    })
                                                )
                                            ),
                                            h.Class(
                                                navigationLinkClassName(
                                                    currentRouteTag ===
                                                        "AuthDashboard"
                                                )
                                            ),
                                        ],
                                        ["Dashboard"]
                                    ),
                                ]
                            ),
                            h.li(
                                [],
                                [
                                    h.a(
                                        [
                                            h.Href(hrefs.settings),
                                            h.OnClick(
                                                toParentMessage(
                                                    ChangedRoute({
                                                        route: AuthSettingsRoute(),
                                                    })
                                                )
                                            ),
                                            h.Class(
                                                navigationLinkClassName(
                                                    currentRouteTag ===
                                                        "AuthSettings"
                                                )
                                            ),
                                        ],
                                        ["Settings"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("text-sm text-muted-foreground")],
                        [`Signed in as ${email}`]
                    ),
                ]
            ),
        ]
    )
}

const notFoundView = <ParentMessage>(
    path: string,
    href: string,
    label: string,
    route: ReturnType<typeof AuthHomeRoute> | ReturnType<typeof AuthDashboardRoute>,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("max-w-2xl mx-auto px-4 py-16 text-center")],
        [
            h.h1(
                [h.Class("text-4xl font-bold text-destructive mb-4")],
                ["Page Not Found"]
            ),
            h.p(
                [h.Class("text-lg text-muted-foreground mb-6")],
                [`The path "${path}" was not found.`]
            ),
            h.a(
                [
                    h.Href(href),
                    h.OnClick(
                        toParentMessage(ChangedRoute({ route }))
                    ),
                    h.Class("text-primary hover:underline font-medium"),
                ],
                [label]
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: Model,
    hrefs: Hrefs,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const { keyed } = h

    return keyed("div")(
        `${model._tag}:${model.route._tag}`,
        [h.Class("min-h-screen bg-background text-foreground")],
        [
            M.value(model).pipe(
                M.tagsExhaustive({
                    LoggedOut: ({ route, loginModel }) =>
                        h.div(
                            [h.Class("py-8")],
                            [
                                M.value(route).pipe(
                                    M.tagsExhaustive({
                                        AuthHome: () =>
                                            homeView<ParentMessage>(
                                                hrefs,
                                                toParentMessage,
                                                h
                                            ),
                                        AuthLogin: () =>
                                            loginView(
                                                loginModel,
                                                toParentMessage,
                                                h
                                            ),
                                        AuthNotFound: ({ path }) =>
                                            notFoundView<ParentMessage>(
                                                path,
                                                hrefs.home,
                                                "Go Home",
                                                AuthHomeRoute(),
                                                toParentMessage,
                                                h
                                            ),
                                    })
                                ),
                            ]
                        ),
                    LoggedIn: ({ route, session }) =>
                        h.div(
                            [h.Class("min-h-screen")],
                            [
                                loggedInNavigationView<ParentMessage>(
                                    route._tag,
                                    session.email,
                                    hrefs,
                                    toParentMessage,
                                    h
                                ),
                                h.main(
                                    [h.Class("py-8")],
                                    [
                                        M.value(route).pipe(
                                            M.tagsExhaustive({
                                                AuthDashboard: () =>
                                                    dashboardView<ParentMessage>(
                                                        session.name,
                                                        h
                                                    ),
                                                AuthSettings: () =>
                                                    settingsView(
                                                        session,
                                                        toParentMessage,
                                                        h
                                                    ),
                                                AuthNotFound: ({ path }) =>
                                                    notFoundView<ParentMessage>(
                                                        path,
                                                        hrefs.dashboard,
                                                        "Go to Dashboard",
                                                        AuthDashboardRoute(),
                                                        toParentMessage,
                                                        h
                                                    ),
                                            })
                                        ),
                                    ]
                                ),
                            ]
                        ),
                })
            ),
        ]
    )
}
