import { Array, Option, String } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import {
    ChangedRoute,
    ChangedSearchInput,
    type Message,
} from "./routing.message.ts"
import {
    RoutingHomeRoute,
    RoutingNestedRoute,
    RoutingPeopleRoute,
    RoutingPersonRoute,
    type RoutingRoute,
    routingHref as routingHomeHref,
    routingNestedHref,
    routingPeopleHref,
    routingPersonHref,
} from "./routing.route.ts"

export type RoutingHrefs = Readonly<{
    home: () => string
    nested: () => string
    people: (search_text: Option.Option<string>) => string
    person: (person_id: number) => string
}>

const default_hrefs: RoutingHrefs = {
    home: routingHomeHref,
    nested: routingNestedHref,
    people: routingPeopleHref,
    person: routingPersonHref,
}

type Person = Readonly<{
    id: number
    name: string
    role: string
}>

const people: ReadonlyArray<Person> = [
    { id: 1, name: "Alice Johnson", role: "Designer" },
    { id: 2, name: "Bob Smith", role: "Developer" },
    { id: 3, name: "Carol Davis", role: "Manager" },
    { id: 4, name: "David Wilson", role: "Developer" },
    { id: 5, name: "Eva Brown", role: "Designer" },
]

const findPerson = (id: number) =>
    Array.findFirst(people, (person) => person.id === id)
const navigationView = <ParentMessage>(
    route: RoutingRoute,
    hrefs: RoutingHrefs,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const navLinkClassName = (isActive: boolean) =>
        isActive
            ? "rounded-[var(--radius-control)] bg-accent px-3 py-2 text-sm font-medium text-accent-foreground border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
            : "rounded-[var(--radius-control)] px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"

    const isPeopleRoute =
        route._tag === "RoutingPeople" || route._tag === "RoutingPerson"

    return h.nav(
        [
            h.Class(
                "border-b-(length:--surface-border-width) border-border bg-card"
            ),
        ],
        [
            h.div(
                [h.Class("mx-auto flex max-w-5xl gap-4 px-4 py-3")],
                [
                    h.a(
                        [
                            h.Href(hrefs.home()),
                            h.OnClick(
                                toParentMessage(
                                    ChangedRoute({ route: RoutingHomeRoute() })
                                )
                            ),
                            h.Class(
                                navLinkClassName(route._tag === "RoutingHome")
                            ),
                        ],
                        ["Home"]
                    ),
                    h.a(
                        [
                            h.Href(hrefs.people(Option.none())),
                            h.OnClick(
                                toParentMessage(
                                    ChangedRoute({
                                        route: RoutingPeopleRoute({
                                            searchText: Option.none(),
                                        }),
                                    })
                                )
                            ),
                            h.Class(navLinkClassName(isPeopleRoute)),
                        ],
                        ["People"]
                    ),
                    h.a(
                        [
                            h.Href(hrefs.nested()),
                            h.OnClick(
                                toParentMessage(
                                    ChangedRoute({
                                        route: RoutingNestedRoute(),
                                    })
                                )
                            ),
                            h.Class(
                                navLinkClassName(route._tag === "RoutingNested")
                            ),
                        ],
                        ["Nested"]
                    ),
                ]
            ),
        ]
    )
}

const homeView = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html =>
    h.div(
        [h.Class("mx-auto max-w-5xl px-4 py-8")],
        [
            h.h1(
                [
                    h.Class(
                        "mb-6 text-4xl font-bold tracking-tight text-foreground"
                    ),
                ],
                ["Routing"]
            ),
            h.p(
                [
                    h.Class(
                        "max-w-2xl text-base leading-7 text-muted-foreground"
                    ),
                ],
                [
                    "Navigate between routes, search the people list, and deep-link directly to a person.",
                ]
            ),
        ]
    )

const nestedView = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html =>
    h.div(
        [h.Class("mx-auto max-w-5xl px-4 py-8")],
        [
            h.h1(
                [
                    h.Class(
                        "mb-6 text-4xl font-bold tracking-tight text-foreground"
                    ),
                ],
                ["Very Nested Route!"]
            ),
            h.p(
                [
                    h.Class(
                        "max-w-2xl text-base leading-7 text-muted-foreground"
                    ),
                ],
                [
                    "You found the deeply nested route at /labs/learn/routing/nested/route/is/very/nested/",
                ]
            ),
        ]
    )

const peopleView = <ParentMessage>(
    searchText: Option.Option<string>,
    hrefs: RoutingHrefs,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const query = Option.match(searchText, {
        onNone: () => "",
        onSome: (value) => String.toLowerCase(value),
    })

    const filteredPeople = Option.match(searchText, {
        onNone: () => people,
        onSome: () =>
            Array.filter(people, (person) => {
                const name = String.toLowerCase(person.name)
                const role = String.toLowerCase(person.role)
                return name.includes(query) || role.includes(query)
            }),
    })

    return h.div(
        [h.Class("mx-auto max-w-5xl px-4 py-8")],
        [
            h.h1(
                [
                    h.Class(
                        "mb-6 text-4xl font-bold tracking-tight text-foreground"
                    ),
                ],
                ["People"]
            ),
            h.div(
                [h.Class("mb-6 max-w-md")],
                [
                    h.input([
                        h.Value(Option.getOrElse(searchText, () => "")),
                        h.Placeholder("Search by name or role..."),
                        h.Class(
                            "w-full rounded-[var(--radius-surface)] border-(length:--field-border-width) border-input bg-background px-4 py-2 text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                        ),
                        h.OnInput((value) =>
                            toParentMessage(ChangedSearchInput({ value }))
                        ),
                    ]),
                ]
            ),
            h.p(
                [h.Class("mb-6 text-sm text-muted-foreground")],
                [
                    Option.match(searchText, {
                        onNone: () => "Click a person to open their route.",
                        onSome: (value) =>
                            `${Array.length(filteredPeople)} results for "${value}"`,
                    }),
                ]
            ),
            h.ul(
                [h.Class("grid gap-3")],
                Array.map(filteredPeople, (person) =>
                    h.keyed("li")(
                        person.id,
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"
                            ),
                        ],
                        [
                            h.a(
                                [
                                    h.Href(hrefs.person(person.id)),
                                    h.OnClick(
                                        toParentMessage(
                                            ChangedRoute({
                                                route: RoutingPersonRoute({
                                                    personId: person.id,
                                                }),
                                            })
                                        )
                                    ),
                                    h.Class(
                                        "block rounded-[var(--radius-control)] px-4 py-3 transition-colors hover:bg-accent hover:text-accent-foreground border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "flex items-center justify-between gap-4"
                                            ),
                                        ],
                                        [
                                            h.div(
                                                [],
                                                [
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "text-base font-medium text-foreground"
                                                            ),
                                                        ],
                                                        [person.name]
                                                    ),
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "text-sm text-muted-foreground"
                                                            ),
                                                        ],
                                                        [person.role]
                                                    ),
                                                ]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "text-sm text-muted-foreground"
                                                    ),
                                                ],
                                                [`${person.id}`]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    )
                )
            ),
        ]
    )
}

const personView = <ParentMessage>(
    personId: number,
    hrefs: RoutingHrefs,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const maybePerson = findPerson(personId)

    return Option.match(maybePerson, {
        onNone: () =>
            h.div(
                [h.Class("mx-auto max-w-5xl px-4 py-8")],
                [
                    h.h1(
                        [
                            h.Class(
                                "mb-6 text-4xl font-bold tracking-tight text-foreground"
                            ),
                        ],
                        ["Person Not Found"]
                    ),
                    h.p(
                        [h.Class("mb-4 text-base text-muted-foreground")],
                        [`No person found with ID: ${personId}`]
                    ),
                    h.a(
                        [
                            h.Href(hrefs.people(Option.none())),
                            h.OnClick(
                                toParentMessage(
                                    ChangedRoute({
                                        route: RoutingPeopleRoute({
                                            searchText: Option.none(),
                                        }),
                                    })
                                )
                            ),
                            h.Class("text-primary underline"),
                        ],
                        ["← Back to People"]
                    ),
                ]
            ),
        onSome: (person) =>
            h.div(
                [h.Class("mx-auto max-w-5xl px-4 py-8")],
                [
                    h.a(
                        [
                            h.Href(hrefs.people(Option.none())),
                            h.OnClick(
                                toParentMessage(
                                    ChangedRoute({
                                        route: RoutingPeopleRoute({
                                            searchText: Option.none(),
                                        }),
                                    })
                                )
                            ),
                            h.Class("mb-4 inline-block text-primary underline"),
                        ],
                        ["← Back to People"]
                    ),
                    h.h2(
                        [
                            h.Class(
                                "mb-6 text-4xl font-bold tracking-tight text-foreground"
                            ),
                        ],
                        [person.name]
                    ),
                    h.div(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("grid gap-4 sm:grid-cols-2")],
                                [
                                    h.div(
                                        [],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                                                    ),
                                                ],
                                                ["ID"]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "mt-1 text-lg text-foreground"
                                                    ),
                                                ],
                                                [`${person.id}`]
                                            ),
                                        ]
                                    ),
                                    h.div(
                                        [],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                                                    ),
                                                ],
                                                ["Role"]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "mt-1 text-lg text-foreground"
                                                    ),
                                                ],
                                                [person.role]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
    })
}

const notFoundView = <ParentMessage>(
    path: string,
    hrefs: RoutingHrefs,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("mx-auto max-w-5xl px-4 py-8")],
        [
            h.h1(
                [
                    h.Class(
                        "mb-6 text-4xl font-bold tracking-tight text-foreground"
                    ),
                ],
                ["404 - Page Not Found"]
            ),
            h.p(
                [h.Class("mb-4 text-base text-muted-foreground")],
                [`The path "${path}" was not found.`]
            ),
            h.a(
                [
                    h.Href(hrefs.home()),
                    h.OnClick(
                        toParentMessage(
                            ChangedRoute({ route: RoutingHomeRoute() })
                        )
                    ),
                    h.Class("text-primary underline"),
                ],
                ["← Go Home"]
            ),
        ]
    )

export const view = <ParentMessage>(
    route: RoutingRoute,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>,
    hrefs: RoutingHrefs = default_hrefs
): Html => {
    const routeContent = (() => {
        switch (route._tag) {
            case "RoutingHome":
                return homeView(h)
            case "RoutingNested":
                return nestedView(h)
            case "RoutingPeople":
                return peopleView(
                    route.searchText,
                    hrefs,
                    (message) => toParentMessage(message),
                    h
                )
            case "RoutingPerson":
                return personView(
                    route.personId,
                    hrefs,
                    toParentMessage,
                    h
                )
            case "RoutingNotFound":
                return notFoundView(route.path, hrefs, toParentMessage, h)
            default:
                return notFoundView("Routing", hrefs, toParentMessage, h)
        }
    })()

    return h.div(
        [h.Class("min-h-screen bg-background text-foreground")],
        [
            navigationView(route, hrefs, toParentMessage, h),
            h.main(
                [h.Class("py-8")],
                [h.keyed("div")(route._tag, [], [routeContent])]
            ),
        ]
    )
}
