import { Context, Effect, Layer, Schema } from "effect"
import { Command, Submodel } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { BreachCheckResult } from "@urm/contracts/auth"
import type { DesktopRoute } from "../../routing/route.ts"

export const breach_check_href = () => "/auth/breach-check"
export const is_breach_check_path = (path: string) =>
    path.replace(/\/$/, "") === "/auth/breach-check"

export const Model = Schema.Struct({
    active: Schema.Boolean,
    email: Schema.String,
    checked_email: Schema.String,
    busy: Schema.Boolean,
    request_id: Schema.Number,
    result: Schema.NullOr(BreachCheckResult),
})
export type Model = typeof Model.Type

export const ChangedEmail = taggedStruct("ChangedEmail", { value: Schema.String })
export const SubmittedCheck = taggedStruct("SubmittedCheck")
export const CompletedCheck = taggedStruct("CompletedCheck", {
    request_id: Schema.Number,
    result: BreachCheckResult,
})
export const Message = Schema.Union([
    ChangedEmail,
    SubmittedCheck,
    CompletedCheck,
])
export type Message = typeof Message.Type

export class BreachCheckError extends Schema.TaggedError<BreachCheckError>()(
    "BreachCheckError",
    { message: Schema.String }
) {}

/**
 * The browser holds neither the HIBP key nor the rate limits: both sit behind
 * the app's own `/auth/breach-check`, so the lab only needs a way to post an
 * address to it.
 */
export class BreachCheckApi extends Context.Service<
    BreachCheckApi,
    {
        readonly check: (
            email: string
        ) => Effect.Effect<BreachCheckResult, BreachCheckError>
    }
>()("BreachCheckApi") {}

const invalid_response = () =>
    new BreachCheckError({ message: "The breach check response was invalid." })

export const browser_breach_check = (
    origin: string,
    fetch_impl: typeof fetch = fetch
): Layer.Layer<BreachCheckApi> =>
    Layer.succeed(
        BreachCheckApi,
        BreachCheckApi.of({
            check: Effect.fn("BreachCheck.check")(function* (email: string) {
                const response = yield* Effect.tryPromise({
                    try: (signal) =>
                        fetch_impl(new URL("/auth/breach-check", origin), {
                            method: "POST",
                            credentials: "same-origin",
                            signal,
                            headers: {
                                "x-requested-with": "XMLHttpRequest",
                                "content-type": "application/json",
                            },
                            body: JSON.stringify({ email }),
                        }),
                    catch: () =>
                        new BreachCheckError({
                            message: "Could not reach the breach checker.",
                        }),
                })
                const body = yield* Effect.tryPromise({
                    try: () => response.json(),
                    catch: invalid_response,
                })
                return yield* Schema.decodeUnknownEffect(BreachCheckResult)(
                    body
                ).pipe(Effect.mapError(invalid_response))
            }),
        })
    )

const CheckEmailBreaches = Command.define("CheckEmailBreaches", {
    args: { email: Schema.String, request_id: Schema.Number },
    messages: [CompletedCheck],
    execute: ({ email, request_id }) =>
        Effect.gen(function* () {
            const api = yield* BreachCheckApi
            const result = yield* api.check(email)
            return CompletedCheck({ request_id, result })
        }).pipe(
            Effect.catch(() =>
                Effect.succeed(
                    CompletedCheck({
                        request_id,
                        result: {
                            status: "error",
                            breaches: [],
                            message:
                                "Could not check this address. Check your connection and sign-in, then try again.",
                        },
                    })
                )
            )
        ),
})

export const init = (route: DesktopRoute): Model => ({
    active: route._tag === "Labs" && is_breach_check_path(route.labs_path),
    email: "",
    checked_email: "",
    busy: false,
    request_id: 0,
    result: null,
})

export const changed_route = (model: Model, route: DesktopRoute): Model => {
    const next = init(route)
    return next.active === model.active
        ? model
        : { ...next, request_id: model.request_id + 1 }
}

export const update = (
    model: Model,
    message: Message
): readonly [
    Model,
    ReadonlyArray<Command.Command<Message, never, BreachCheckApi>>,
] => {
    if (!model.active) return [model, []]
    switch (message._tag) {
        case "ChangedEmail":
            return model.busy
                ? [model, []]
                : [
                      {
                          ...model,
                          email: message.value,
                          result: null,
                          checked_email: "",
                      },
                      [],
                  ]
        case "SubmittedCheck": {
            if (model.busy) return [model, []]
            const email = model.email.trim().toLowerCase()
            if (
                email.length > 254 ||
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
            ) {
                return [
                    {
                        ...model,
                        result: {
                            status: "error",
                            breaches: [],
                            message: "Enter a valid email address.",
                        },
                    },
                    [],
                ]
            }
            const request_id = model.request_id + 1
            return [
                {
                    ...model,
                    email,
                    checked_email: email,
                    busy: true,
                    result: null,
                    request_id,
                },
                [CheckEmailBreaches({ email, request_id })],
            ]
        }
        case "CompletedCheck":
            return !model.busy || message.request_id !== model.request_id
                ? [model, []]
                : [{ ...model, busy: false, result: message.result }, []]
    }
}

export const view = Submodel.defineView<Model, Message>((model, h) =>
    h.div(
        [h.Class("mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6")],
        [
            h.div(
                [],
                [
                    h.h1(
                        [h.Class("text-2xl font-semibold")],
                        ["Email breach checker"]
                    ),
                    h.p(
                        [h.Class("mt-2 text-muted-foreground")],
                        [
                            "Check whether an email address appears in known data breaches.",
                        ]
                    ),
                ]
            ),
            h.form(
                [
                    h.OnSubmit(SubmittedCheck()),
                    h.Class(
                        "space-y-4 rounded-[var(--radius-surface)] border border-border bg-card p-5"
                    ),
                ],
                [
                    h.label(
                        [
                            h.For("breach-check-email"),
                            h.Class("block text-sm font-medium"),
                        ],
                        ["Email address"]
                    ),
                    h.input([
                        h.Id("breach-check-email"),
                        h.Name("email"),
                        h.Type("email"),
                        h.Autocomplete("email"),
                        h.Required(true),
                        h.Maxlength(254),
                        h.Value(model.email),
                        h.Disabled(model.busy),
                        h.Attribute("aria-describedby", "breach-check-help"),
                        h.OnInput((value) => ChangedEmail({ value })),
                        h.Class(
                            "h-12 w-full rounded-[var(--radius-control)] border border-input bg-background px-3 text-base focus-visible:outline-2 focus-visible:outline-ring"
                        ),
                    ]),
                    h.p(
                        [
                            h.Id("breach-check-help"),
                            h.Class("text-sm text-muted-foreground"),
                        ],
                        [
                            "Submitting sends this address to Have I Been Pwned. Check your own address or one you have permission to check.",
                        ]
                    ),
                    h.button(
                        [
                            h.Type("submit"),
                            h.Disabled(model.busy),
                            h.Class(
                                "min-h-12 rounded-[var(--radius-control)] bg-primary px-4 py-2 font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                            ),
                        ],
                        [model.busy ? "Checking…" : "Check email"]
                    ),
                ]
            ),
            h.div(
                [h.Role("status"), h.Attribute("aria-live", "polite")],
                model.result === null
                    ? []
                    : [
                          h.p(
                              [h.Class("font-semibold")],
                              [model.result.message]
                          ),
                          ...(model.checked_email === ""
                              ? []
                              : [
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-1 break-all text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [model.checked_email]
                                    ),
                                ]),
                      ]
            ),
            ...(model.result?.status === "complete"
                ? [
                      h.ul(
                          [h.Class("space-y-3")],
                          model.result.breaches.map((breach) =>
                              h.li(
                                  [
                                      h.Class(
                                          "rounded-[var(--radius-surface)] border border-border bg-card p-5"
                                      ),
                                  ],
                                  [
                                      h.h2(
                                          [h.Class("font-semibold")],
                                          [breach.Title]
                                      ),
                                      h.p(
                                          [
                                              h.Class(
                                                  "mt-1 text-sm text-muted-foreground"
                                              ),
                                          ],
                                          [
                                              `${breach.BreachDate}${breach.Domain === "" ? "" : ` · ${breach.Domain}`}${breach.IsVerified ? "" : " · Unverified breach"}`,
                                          ]
                                      ),
                                      h.p(
                                          [h.Class("mt-3 text-sm")],
                                          [
                                              `Exposed data: ${breach.DataClasses.join(", ")}`,
                                          ]
                                      ),
                                  ]
                              )
                          )
                      ),
                      h.p(
                          [h.Class("text-sm text-muted-foreground")],
                          [
                              "Results cover known breaches available through HIBP’s API. No matches does not guarantee an address is safe.",
                          ]
                      ),
                  ]
                : []),
            h.div(
                [h.Class("space-y-2 text-sm text-muted-foreground")],
                [
                    h.p(
                        [],
                        [
                            "Test without a paid API key using account-exists@hibp-integration-tests.com or opt-out@hibp-integration-tests.com.",
                        ]
                    ),
                    h.a(
                        [
                            h.Href("https://haveibeenpwned.com/"),
                            h.Class("underline underline-offset-4"),
                        ],
                        ["Breach data provided by Have I Been Pwned"]
                    ),
                ]
            ),
        ]
    )
)
