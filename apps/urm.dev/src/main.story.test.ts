import * as DesktopIssues from "./issues/submodel.ts"
import { Effect, Option, Schema as S, Stream } from "effect"
import { Navigation, Story } from "foldkit"
import { Url } from "foldkit/url"
import { describe, expect, test } from "vitest"
import * as Ui from "@foldkit/ui"

import { Domain } from "./domains/domain-record.ts"
import * as DesktopProjects from "./projects/submodel.ts"
import * as DesktopMail from "./mail/submodel.ts"
import * as DesktopForms from "./forms/submodel.ts"
import { auth_connection_id } from "./auth/session.ts"

import {
    GotProjectsMessage,
    GotIssuesMessage,
    GotEventsMessage,
    GotTagsMessage,
    GotContactsMessage,
    GotMailMessage,
    GotMembersMessage,
    GotSocialMessage,
    GotFormsMessage,
    contacts_mail_subscriptions,
    Model,
    GotDomainSwitcherMessage,
    ReceivedDomains,
    ReceivedAccountNavigation,
    app_surface,
    selected_publication_domain,
    social_has_active_domain,
    init,
    update,
} from "./main.ts"
import { ChangedUrl, ClickedLink } from "./routing/message.ts"
import * as Contacts from "./contacts/model.ts"
import * as Members from "./members/model.ts"
import * as MembersManage from "@urm/features/mail/members/manage"
import * as DesktopSocial from "./social/submodel.ts"

const base_model = init(
    Url.make({
        protocol: "http:",
        host: "urm.test",
        port: Option.some("1420"),
        pathname: "/projects",
        search: Option.none(),
        hash: Option.none(),
    })
).model

const test1_domain = S.decodeUnknownSync(Domain)({
    organization_id: "j2700000000000000000000000000001",
    created_by_user_id: "j3700000000000000000000000000001",
    _creationTime: 1,
    _id: "j1700000000000000000000000000001",
    name: "test1",
    slug: "test1",
    publication_status: "draft",
    publication_access: "public",
    updated_at: 1,
})

const test2_domain = S.decodeUnknownSync(Domain)({
    organization_id: "j2700000000000000000000000000001",
    created_by_user_id: "j3700000000000000000000000000001",
    _creationTime: 2,
    _id: "j1700000000000000000000000000002",
    name: "test2",
    slug: "test2",
    publication_status: "draft",
    publication_access: "public",
    updated_at: 2,
})

describe("route-scoped cold loads", () => {
    const url_at = (pathname: string) =>
        Url.make({
            protocol: "http:",
            host: "urm.test",
            port: Option.some("1420"),
            pathname,
            search: Option.none(),
            hash: Option.none(),
        })

    const init_at = (pathname: string) => init(url_at(pathname))

    test("refreshes publication capabilities when returning to Publishing", () => {
        const model = {
            ...base_model,
            domain_publishing: {
                ...base_model.domain_publishing,
                account_id: "account",
                domain_id: "domain",
                can_write: true,
            },
        }
        const [entered, commands] = update(
            model,
            ChangedUrl({ url: url_at("/web/publishing") })
        )
        expect(
            commands.filter(
                (command) => command.name === "ReadOrBuildPublication"
            )
        ).toHaveLength(1)
        expect(entered.domain_publishing.pending).toBe(true)
        const [away] = update(
            entered,
            ChangedUrl({ url: url_at("/dashboard") })
        )
        const [, during_load] = update(
            away,
            ChangedUrl({ url: url_at("/web/publishing") })
        )
        expect(
            during_load.filter(
                (command) => command.name === "ReadOrBuildPublication"
            )
        ).toHaveLength(0)
        const [, returned] = update(
            {
                ...away,
                domain_publishing: {
                    ...away.domain_publishing,
                    pending: false,
                },
            },
            ChangedUrl({ url: url_at("/web/publishing") })
        )
        expect(
            returned.filter(
                (command) => command.name === "ReadOrBuildPublication"
            )
        ).toHaveLength(1)
    })

    test("does not start Labs or Learn commands on the dashboard", () => {
        const { commands = [] } = init_at("/dashboard")

        expect(commands).toHaveLength(0)
    })

    test("does not start child commands on section index routes", () => {
        expect(init_at("/labs").commands ?? []).toHaveLength(0)
        expect(init_at("/learn").commands ?? []).toHaveLength(0)
    })

    test("starts Learn commands on a Learn cold load", () => {
        const { commands = [] } = init_at("/learn/state/counter/")

        expect(commands.map((command) => command.name)).toEqual([
            "FetchWeather",
            "FetchBooks",
            "FetchAgeAtDeath",
        ])
    })

    test("starts and stops leaf commands at client route boundaries", () => {
        const { model: dashboard } = init_at("/dashboard")
        const [learn, enter_commands] = update(
            dashboard,
            ChangedUrl({ url: url_at("/learn/state/counter/") })
        )
        const [, leave_commands] = update(
            learn,
            ChangedUrl({ url: url_at("/dashboard") })
        )

        expect(enter_commands.map((command) => command.name)).toEqual([
            "FetchWeather",
            "FetchBooks",
            "FetchAgeAtDeath",
        ])
        expect(leave_commands).toHaveLength(0)
    })
})

describe("host and authentication surfaces", () => {
    const model_for_host = (host: string, search = Option.none<string>()) =>
        init(
            Url.make({
                protocol: "http:",
                host,
                port: Option.some("1420"),
                pathname: "/dashboard",
                search,
                hash: Option.none(),
            })
        ).model

    test("keeps the suffix root on the public surface", () => {
        expect(app_surface(model_for_host("urm.test"))).toBe("public")
    })

    test("uses the PostgreSQL session on central hosts", () => {
        const insecure = model_for_host("app.urm.test")
        const loading = model_for_host("app.localhost")
        const signed_out = Model.make({
            ...loading,
            auth: { ...loading.auth, status: "signed_out" },
            contacts: {
                ...loading.contacts,
                connection_id: Contacts.boot_id,
                busy: false,
            },
        })
        const signed_in = Model.make({
            ...signed_out,
            contacts: {
                ...signed_out.contacts,
                session: {
                    account_id: "account-a",
                    domains: [],
                },
            },
        })

        expect(app_surface(insecure)).toBe("checking_session")
        expect(app_surface(loading)).toBe("checking_session")
        expect(app_surface(signed_out)).toBe("sign_in")
        expect(app_surface(signed_in)).toBe("account")
    })

    test("opens only the PostgreSQL workspace named by the central URL", () => {
        const loading = model_for_host(
            "app.localhost",
            Option.some("?domain=test1")
        )
        const signed_in = Model.make({
            ...loading,
            auth: { ...loading.auth, status: "signed_out" },
            contacts: {
                ...loading.contacts,
                connection_id: Contacts.boot_id,
                busy: false,
                requested_slug: "test1",
                session: {
                    account_id: "account-a",
                    domains: [
                        {
                            id: "postgres-test1",
                            slug: "test1",
                            name: "Test 1",
                            organization_name: "Personal",
                            can_write: true,
                        },
                        {
                            id: "postgres-test2",
                            slug: "test2",
                            name: "Test 2",
                            organization_name: "Personal",
                            can_write: true,
                        },
                    ],
                },
                domain_id: "postgres-test1",
            },
        })
        const denied = Model.make({
            ...signed_in,
            contacts: { ...signed_in.contacts, domain_id: "postgres-test2" },
        })

        expect(app_surface(signed_in)).toBe("domain")
        expect(signed_in.contacts.domain_id).toBe("postgres-test1")
        expect(
            Option.map(
                selected_publication_domain(signed_in),
                (domain) => domain.slug
            )
        ).toEqual(Option.some("test1"))
        expect(social_has_active_domain(signed_in)).toBe(true)
        expect(app_surface(denied)).toBe("access_denied")
        expect(Option.isNone(denied.active_domain_id)).toBe(true)
        expect(Option.isNone(selected_publication_domain(denied))).toBe(true)
        expect(social_has_active_domain(denied)).toBe(false)
    })

    test("uses the selected PostgreSQL domain as the publishing root site", () => {
        const model = init(
            Url.make({
                protocol: "http:",
                host: "app.localhost",
                port: Option.some("1420"),
                pathname: "/design/layouts/main-layout",
                search: Option.some("domain=test1"),
                hash: Option.none(),
            })
        ).model
        const [opened] = update(
            model,
            GotContactsMessage({
                message: Contacts.opened_domain("test1"),
            })
        )
        const [loaded] = update(
            opened,
            GotContactsMessage({
                message: Contacts.Message.SessionLoaded({
                    epoch: opened.contacts.epoch,
                    session: {
                        account_id: "account-a",
                        domains: [
                            {
                                id: "postgres-test1",
                                slug: "test1",
                                name: "Test 1",
                                organization_name: "Personal",
                                can_write: true,
                            },
                        ],
                    },
                }),
            })
        )

        expect(loaded.domain_publishing.domain_id).toBe("postgres-test1")
        expect(loaded.design.ui.editor.sites).toEqual([
            expect.objectContaining({
                id: "postgres-test1",
                domain_id: "postgres-test1",
                name: "Test 1",
            }),
        ])
    })

    test("fully loads a workspace selected on the central host", () => {
        const base_account = model_for_host("app.localhost")
        const account = Model.make({
            ...base_account,
            auth_connection_id,
            auth: { ...base_account.auth, status: "signed_in" },
            domains_status: "success",
            domains: [test1_domain],
        })
        const workspace_url = Url.make({
            protocol: "http:",
            host: "app.localhost",
            port: Option.some("1420"),
            pathname: "/dashboard",
            search: Option.some("domain=test1"),
            hash: Option.none(),
        })
        const [, commands] = update(
            account,
            ClickedLink({
                request: Navigation.UrlRequest.Internal({ url: workspace_url }),
            })
        )

        expect(commands).toHaveLength(1)
        expect(commands[0]?.name).toBe("NavigateInternal")
        expect(commands[0]?.args).toEqual({
            href: "http://app.localhost:1420/dashboard?domain=test1",
        })
    })

    test("switches account domains without navigating to the dashboard", () => {
        const account = model_for_host(
            "app.localhost",
            Option.some("domain=test1")
        )
        const selected = Model.make({
            ...account,
            contacts: {
                ...account.contacts,
                connection_id: Contacts.boot_id,
                session: {
                    account_id: "account-a",
                    domains: [
                        {
                            id: "postgres-test1",
                            slug: "test1",
                            name: "Test 1",
                            organization_name: "Personal",
                            can_write: true,
                        },
                        {
                            id: "postgres-test2",
                            slug: "test2",
                            name: "Test 2",
                            organization_name: "Personal",
                            can_write: true,
                        },
                    ],
                },
                domain_id: "postgres-test1",
            },
        })
        const [, commands] = update(
            selected,
            GotDomainSwitcherMessage({
                message: Ui.Listbox.Message.SelectedItem({
                    item: "postgres-test2",
                }),
            })
        )

        expect(commands.map((command) => command.name)).toContain(
            "NavigateSelectedDomain"
        )
        expect(commands.map((command) => command.name)).not.toContain(
            "NavigateInternal"
        )
    })

    test("keeps the domain surface mounted while switching known domains", () => {
        const account = model_for_host(
            "app.localhost",
            Option.some("domain=test1")
        )
        const selected = Model.make({
            ...account,
            contacts: {
                ...account.contacts,
                connection_id: Contacts.boot_id,
                busy: false,
                requested_slug: "test1",
                session: {
                    account_id: "account-a",
                    domains: [
                        {
                            id: "postgres-test1",
                            slug: "test1",
                            name: "Test 1",
                            organization_name: "Personal",
                            can_write: true,
                        },
                        {
                            id: "postgres-test2",
                            slug: "test2",
                            name: "Test 2",
                            organization_name: "Personal",
                            can_write: true,
                        },
                    ],
                },
                domain_id: "postgres-test1",
            },
        })
        const [switched] = update(
            selected,
            ChangedUrl({
                url: Url.make({
                    protocol: "http:",
                    host: "app.localhost",
                    port: Option.some("1420"),
                    pathname: "/dashboard",
                    search: Option.some("domain=test2"),
                    hash: Option.none(),
                }),
            })
        )

        expect(app_surface(selected)).toBe("domain")
        expect(app_surface(switched)).toBe("domain")
        expect(switched.contacts.domain_id).toBe("postgres-test2")
    })

    test("retains the selected workspace on internal path navigation", () => {
        const selected = model_for_host(
            "app.localhost",
            Option.some("domain=test1")
        )
        const event_url = Url.make({
            protocol: "http:",
            host: "app.localhost",
            port: Option.some("1420"),
            pathname: "/events/event-1",
            search: Option.none(),
            hash: Option.none(),
        })
        const [, commands] = update(
            selected,
            ClickedLink({
                request: Navigation.UrlRequest.Internal({ url: event_url }),
            })
        )

        expect(commands[0]?.name).toBe("NavigateInternal")
        expect(commands[0]?.args).toEqual({
            href: "http://app.localhost:1420/events/event-1?domain=test1",
        })
    })

    test("keeps a tenant hostname on the public surface", () => {
        expect(app_surface(model_for_host("test1.localhost"))).toBe("public")
    })
})

const initial_model = Model.make({
    ...base_model,
    auth_connection_id,
    auth: { ...base_model.auth, status: "signed_in" },
    navigation_settings: {
        ...base_model.navigation_settings,
        domain_id: test1_domain._id,
        snapshot: Option.some({
            domain_id: test1_domain._id,
            sidebar_order: base_model.navigation_settings.sidebar_order,
            hidden_modules: [],
            enabled_modules: base_model.navigation_settings.enabled_modules,
            can_manage_modules: true,
        }),
    },
    domains: [test1_domain, test2_domain],
    active_domain_id: Option.some(test1_domain._id),
})

test("Social commands use the PostgreSQL workspace matched by slug", () => {
    const model = Model.make({
        ...initial_model,
        route: { _tag: "Social" },
        contacts: {
            ...initial_model.contacts,
            requested_slug: "test1",
            session: {
                account_id: "owned-account",
                domains: [
                    {
                        id: "postgres-domain",
                        slug: "test1",
                        name: "Test",
                        organization_name: "Org",
                        can_write: true,
                    },
                ],
            },
            domain_id: "postgres-domain",
        },
    })
    const [, commands] = update(
        model,
        GotSocialMessage({
            message: DesktopSocial.Message.make({
                _tag: "ClickedSyncAccounts",
            }),
        })
    )
    expect(commands.map((command) => command.name)).toContain(
        "SyncDesktopSocialAccounts"
    )
    expect(
        commands.find((command) => command.name === "SyncDesktopSocialAccounts")
            ?.args
    ).toEqual({ domain_id: "postgres-domain" })
})

test("Forms create uses the PostgreSQL workspace instead of the shell domain ID", () => {
    const [forms] = DesktopForms.init("/forms")
    const model = Model.make({
        ...initial_model,
        route: { _tag: "Forms", forms_path: "/forms" },
        forms: Option.some(forms),
        contacts: {
            ...initial_model.contacts,
            requested_slug: "test1",
            session: {
                account_id: "owned-account",
                domains: [
                    {
                        id: "postgres-domain",
                        slug: "test1",
                        name: "Test",
                        organization_name: "Org",
                        can_write: true,
                    },
                ],
            },
            domain_id: "postgres-domain",
        },
    })
    const forms_message = S.decodeUnknownSync(DesktopForms.Message)
    const [creating] = update(
        model,
        GotFormsMessage({ message: forms_message({ _tag: "ToggledCreating" }) })
    )
    const [named] = update(
        creating,
        GotFormsMessage({
            message: forms_message({
                _tag: "ChangedNewTitle",
                value: "Customer feedback",
            }),
        })
    )
    const [, commands] = update(
        named,
        GotFormsMessage({
            message: forms_message({ _tag: "SubmittedNewForm" }),
        })
    )

    expect(
        commands.find((command) => command.name === "CreateForm")?.args
    ).toMatchObject({
        domain_id: "postgres-domain",
        slug: "customer-feedback",
    })
})

test("Contacts and Members start with Mail and keep the same subscription across its children", async () => {
    const subscription = contacts_mail_subscriptions.session
    const mail = Model.make({
        ...initial_model,
        route: { _tag: "Mail", mail_path: "/mail" },
    })
    const parent = subscription.modelToDependencies(mail)
    const contacts = subscription.modelToDependencies({
        ...mail,
        route: { _tag: "Mail", mail_path: "/mail/contacts" },
    })
    const members = subscription.modelToDependencies({
        ...mail,
        route: { _tag: "Mail", mail_path: "/mail/members" },
    })
    expect(contacts).toEqual(parent)
    expect(members).toEqual(parent)
    expect(subscription.modelToDependencies(initial_model)).not.toEqual(parent)
    const messages = await Effect.runPromise(
        Stream.runCollect(
            subscription.dependenciesToStream(parent, () => parent)
        )
    )
    expect(messages).toHaveLength(1)
    const message = messages[0]
    if (message === undefined) throw new Error("Mail session load missing")
    const [, commands] = update(mail, message)
    expect(commands.map((command) => command.name)).toEqual([
        "ContactsLoadSession",
    ])
    const [opened] = update(mail, message)
    const [authenticated, loaded_commands] = update(
        opened,
        GotContactsMessage({
            message: Contacts.Message.SessionLoaded({
                epoch: opened.contacts.epoch,
                session: {
                    account_id: "owned-account",
                    domains: [
                        {
                            id: "postgres-domain",
                            slug: test1_domain.slug,
                            name: "Test",
                            organization_name: "Org",
                            can_write: true,
                        },
                    ],
                },
            }),
        })
    )
    expect(loaded_commands.map((command) => command.name)).toEqual(
        expect.arrayContaining([
            "LoadBookmarkCatalog",
            "LoadDocumentLibrary",
            "LoadBlogLibrary",
            "LoadTagCatalog",
            "LoadMailTransactionalDeliveries",
            "LoadMailStats",
            "LoadMediaLibrary",
            "ContactsLoadPage",
            "MembersLoad",
        ])
    )
    expect(authenticated.members.domain_id).toBe("postgres-domain")
    const [cleared] = update(
        authenticated,
        GotContactsMessage({ message: Contacts.Message.SignedOut() })
    )
    expect(cleared.members.domain_id).toBe("")
    expect(cleared.media.domain_id).toBe("")
    const [late] = update(
        cleared,
        GotMembersMessage({
            message: Members.Message.Loaded({
                epoch: authenticated.members.epoch,
                remote: authenticated.members.remote,
                saved: false,
                can_write: true,
            }),
        })
    )
    expect(late.members).toEqual(cleared.members)
    const [, legacy_commands] = update(authenticated, {
        _tag: "GotMailMessage",
        message: {
            _tag: "GotMembersManageMessage",
            message: MembersManage.ClickedCreateMember(),
        },
    })
    expect(legacy_commands).toEqual([])
})

describe("desktop projects workspace", () => {
    test("loads and unloads the Forms parent at its route boundary", () => {
        const dashboard_model = init(
            Url.make({
                protocol: "http:",
                host: "urm.test",
                port: Option.some("1420"),
                pathname: "/",
                search: Option.none(),
                hash: Option.none(),
            })
        ).model
        const [forms_model] = update(
            dashboard_model,
            ChangedUrl({
                url: Url.make({
                    protocol: "http:",
                    host: "urm.test",
                    port: Option.some("1420"),
                    pathname: "/forms/contact",
                    search: Option.none(),
                    hash: Option.none(),
                }),
            })
        )
        const [submissions_model] = update(
            forms_model,
            ChangedUrl({
                url: Url.make({
                    protocol: "http:",
                    host: "urm.test",
                    port: Option.some("1420"),
                    pathname: "/forms/contact/submissions",
                    search: Option.none(),
                    hash: Option.none(),
                }),
            })
        )
        const [dashboard_again] = update(
            submissions_model,
            ChangedUrl({
                url: Url.make({
                    protocol: "http:",
                    host: "urm.test",
                    port: Option.some("1420"),
                    pathname: "/dashboard",
                    search: Option.none(),
                    hash: Option.none(),
                }),
            })
        )

        expect(Option.isSome(forms_model.forms)).toBe(true)
        expect(Option.getOrThrow(submissions_model.forms).route._tag).toBe(
            "FormSubmissions"
        )
        expect(Option.isNone(dashboard_again.forms)).toBe(true)
    })

    test("loads and unloads the Sysadmin parent at its route boundary", () => {
        const dashboard_model = init(
            Url.make({
                protocol: "http:",
                host: "urm.test",
                port: Option.some("1420"),
                pathname: "/dashboard",
                search: Option.none(),
                hash: Option.none(),
            })
        ).model
        const [sysadmin_model, commands] = update(
            dashboard_model,
            ChangedUrl({
                url: Url.make({
                    protocol: "http:",
                    host: "urm.test",
                    port: Option.some("1420"),
                    pathname: "/sysadmin",
                    search: Option.none(),
                    hash: Option.none(),
                }),
            })
        )
        const [dashboard_again] = update(
            sysadmin_model,
            ChangedUrl({
                url: Url.make({
                    protocol: "http:",
                    host: "urm.test",
                    port: Option.some("1420"),
                    pathname: "/dashboard",
                    search: Option.none(),
                    hash: Option.none(),
                }),
            })
        )

        expect(Option.isSome(sysadmin_model.sysadmin)).toBe(true)
        expect(commands).toHaveLength(7)
        expect(Option.isNone(dashboard_again.sysadmin)).toBe(true)
    })

    test("accepts domain snapshots without creating test domains", () => {
        const [loaded_model, commands] = update(
            base_model,
            ReceivedDomains({ domains: [test1_domain, test2_domain] })
        )
        const [, repeated_commands] = update(
            loaded_model,
            ReceivedDomains({ domains: [test1_domain, test2_domain] })
        )

        expect(commands).toHaveLength(0)
        expect(loaded_model.domains).toEqual([test1_domain, test2_domain])
        expect(repeated_commands).toHaveLength(0)
    })

    test("reloads Mail deliveries and stats if the legacy domain snapshot arrives after the account workspace", () => {
        const model: Model = {
            ...base_model,
            host_context: {
                ...base_model.host_context,
                kind: "central",
                requested_domain_slug: Option.some("test1"),
            },
            contacts: {
                ...base_model.contacts,
                domain_id: "postgres-test1",
                session: {
                    account_id: "account-one",
                    domains: [
                        {
                            id: "postgres-test1",
                            slug: "test1",
                            name: "Test 1",
                            organization_name: "Test",
                            can_write: true,
                        },
                    ],
                },
            },
            mail: {
                ...base_model.mail,
                sent: { ...base_model.mail.sent, loading: false },
                stats: { ...base_model.mail.stats, loading: false },
            },
        }
        const [next, commands] = update(
            model,
            ReceivedDomains({ domains: [test1_domain] })
        )
        expect(next.mail.sent.loading).toBe(true)
        expect(next.mail.stats.loading).toBe(true)
        expect(commands.map((command) => command.name)).toEqual([
            "LoadMailTransactionalTemplates",
            "LoadMailTransactionalDeliveries",
            "LoadMailStats",
        ])
    })

    test("loads Mail data when navigation enables Mail after account data resolves", () => {
        const model: Model = {
            ...initial_model,
            navigation_settings: {
                ...initial_model.navigation_settings,
                snapshot: Option.none(),
            },
            contacts: {
                ...initial_model.contacts,
                domain_id: "postgres-test1",
                session: {
                    account_id: "account-one",
                    domains: [
                        {
                            id: "postgres-test1",
                            slug: "test1",
                            name: "Test 1",
                            organization_name: "Test",
                            can_write: true,
                        },
                    ],
                },
            },
        }
        const [before_navigation] = update(
            model,
            GotMailMessage({
                message: DesktopMail.loaded_mail_stats([]),
            })
        )
        expect(before_navigation.mail.stats.loading).toBe(true)

        const [ready, commands] = update(
            before_navigation,
            ReceivedAccountNavigation({
                account_id: "account-one",
                legacy_domain_id: test1_domain._id,
                snapshot: {
                    id: "postgres-test1/navigation",
                    domain_id: "postgres-test1",
                    sidebar_order:
                        initial_model.navigation_settings.sidebar_order,
                    hidden_modules: [],
                    enabled_modules:
                        initial_model.navigation_settings.enabled_modules,
                    can_manage_modules: true,
                },
            })
        )
        expect(commands.map((command) => command.name)).toEqual(
            expect.arrayContaining([
                "LoadMailTransactionalDeliveries",
                "LoadMailStats",
            ])
        )
        const [loaded_stats] = update(
            ready,
            GotMailMessage({ message: DesktopMail.loaded_mail_stats([]) })
        )
        const [loaded] = update(
            loaded_stats,
            GotMailMessage({
                message: DesktopMail.loaded_transactional_deliveries([]),
            })
        )
        expect(loaded.mail.stats.loading).toBe(false)
        expect(loaded.mail.sent.loading).toBe(false)
    })

    test("tracks the project draft without commands", () => {
        Story.story(
            (model: Model, message: Parameters<typeof update>[1]) => {
                const [next_model, commands] = update(model, message)
                return { model: next_model, commands }
            },
            Story.given(initial_model),
            Story.message(
                GotProjectsMessage({
                    message: DesktopProjects.ChangedNewProjectName({
                        value: "Website refresh",
                    }),
                })
            ),
            Story.Command.expectNone(),
            Story.model((model) => {
                expect(model.projects.ui.new_project_name).toBe(
                    "Website refresh"
                )
            })
        )
    })
    test("creates through account Remote only after scope authorization", () => {
        const scoped = {
            ...initial_model,
            projects: {
                ...initial_model.projects,
                account_id: "account",
                domain_id: test1_domain._id,
                can_write: true,
            },
        }
        const [draft] = update(
            scoped,
            GotProjectsMessage({
                message: DesktopProjects.ChangedNewProjectName({
                    value: "  Client portal  ",
                }),
            })
        )
        const [pending, commands] = update(
            draft,
            GotProjectsMessage({
                message: DesktopProjects.SubmittedNewProject({
                    status: "active",
                }),
            })
        )
        expect(commands).toHaveLength(1)
        expect(commands[0]?.name).toBe("SaveProjectCatalog")
        expect(commands[0]?.args).toMatchObject({
            domain_id: test1_domain._id,
            account_id: "account",
            action: {
                _tag: "CreateProject",
                name: "Client portal",
                order: 0,
                status: "active",
            },
        })
        expect(pending.projects.pending).toBe(true)
        expect(DesktopProjects.project(pending.projects).projects).toEqual([])
        expect(
            update(
                { ...draft, projects: { ...draft.projects, can_write: false } },
                GotProjectsMessage({
                    message: DesktopProjects.SubmittedNewProject({
                        status: "active",
                    }),
                })
            )[1]
        ).toHaveLength(0)
    })
    test("switches domain and discards old project responses and drafts", () => {
        const scoped = {
            ...initial_model,
            projects: {
                ...initial_model.projects,
                account_id: "account",
                domain_id: test1_domain._id,
                can_write: true,
                ui: {
                    ...initial_model.projects.ui,
                    new_task_title: "Old workspace draft",
                },
            },
        }
        const [changed] = update(
            scoped,
            GotDomainSwitcherMessage({
                message: Ui.Listbox.Message.SelectedItem({
                    item: test2_domain._id,
                }),
            })
        )
        expect(changed.active_domain_id).toEqual(Option.some(test2_domain._id))
        expect(changed.projects.domain_id).toBe("")
        expect(changed.projects.ui.new_task_title).toBe("")
        const [stale] = update(
            changed,
            GotProjectsMessage({
                message: {
                    _tag: "ProjectCatalogLoaded",
                    epoch: scoped.projects.epoch,
                    remote: scoped.projects.remote,
                },
            })
        )
        expect(stale.projects).toEqual(changed.projects)
    })
    test("does not create an empty project", () => {
        expect(
            update(
                initial_model,
                GotProjectsMessage({
                    message: DesktopProjects.SubmittedNewProject({
                        status: "backlog",
                    }),
                })
            )[1]
        ).toHaveLength(0)
    })
})

describe("migration regression audit", () => {
    test("unrelated editor messages preserve preview and navigation state", () => {
        const [issues] = update(
            initial_model,
            GotIssuesMessage({
                message: { _tag: "NewTitleChanged", value: "Draft" },
            })
        )
        expect(issues.design).toBe(initial_model.design)
        expect(issues.navigation_settings).toBe(
            initial_model.navigation_settings
        )
        const [events] = update(
            initial_model,
            GotEventsMessage({
                message: {
                    _tag: "UpdatedEventDraft",
                    field: "title",
                    value: "Draft event",
                },
            })
        )
        expect(events.design).toBe(initial_model.design)
        expect(events.navigation_settings).toBe(
            initial_model.navigation_settings
        )
    })
    test.each(["Events", "Media", "Tags"])(
        "enabling %s changes the account subscription",
        (module) => {
            const snapshot = Option.getOrThrow(
                initial_model.navigation_settings.snapshot
            )
            const disabled = {
                ...initial_model,
                navigation_settings: {
                    ...initial_model.navigation_settings,
                    snapshot: Option.some({
                        ...snapshot,
                        enabled_modules: snapshot.enabled_modules.filter(
                            (id) => id !== module
                        ),
                    }),
                },
            }
            expect(
                contacts_mail_subscriptions.session.modelToDependencies(
                    disabled
                )
            ).not.toEqual(
                contacts_mail_subscriptions.session.modelToDependencies(
                    initial_model
                )
            )
        }
    )
    test.each([false, true])(
        "tag results refresh both consumers and defer refresh during a save (mutation: %s)",
        (saved) => {
            const model = {
                ...initial_model,
                issues: {
                    ...initial_model.issues,
                    domain_id: "domain",
                    account_id: "account",
                    pending: true,
                },
                projects: {
                    ...initial_model.projects,
                    domain_id: "domain",
                    account_id: "account",
                },
            }
            const [next, commands] = update(
                model,
                GotTagsMessage({
                    message: saved
                        ? {
                              _tag: "TagsSaved",
                              epoch: model.tags.epoch,
                              settlement: {
                                  _tag: "MutationSucceeded",
                                  requestId: "tag-write",
                                  entities: [],
                              },
                              result: { _tag: "CreatedTag" },
                          }
                        : {
                              _tag: "TagsLoaded",
                              epoch: model.tags.epoch,
                              remote: model.tags.remote,
                              result: { _tag: "CreatedTag" },
                          },
                })
            )
            expect(next.issues.refresh_requested).toBe(true)
            expect(
                commands.some(
                    (command) => command.name === "LoadProjectCatalog"
                )
            ).toBe(true)
            const [refreshed, after] = DesktopIssues.update(next.issues, {
                _tag: "IssueCatalogLoaded",
                epoch: next.issues.epoch,
                remote: next.issues.remote,
            })
            expect(after.map((command) => command.name)).toEqual([
                "LoadIssueCatalog",
            ])
            expect(refreshed.refresh_requested).toBe(false)
            expect(refreshed.pending).toBe(true)
            const [pending] = DesktopProjects.update(
                { ...next.projects, pending: true },
                DesktopProjects.Refreshed()
            )
            expect(pending.refresh_requested).toBe(true)
            const [, project_commands] = DesktopProjects.update(pending, {
                _tag: "ProjectCatalogLoaded",
                epoch: pending.epoch,
                remote: pending.remote,
            })
            expect(project_commands.map((command) => command.name)).toEqual([
                "LoadProjectCatalog",
            ])
        }
    )
})
