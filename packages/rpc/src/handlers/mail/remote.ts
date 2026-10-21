import { Effect } from "effect"
import { Entity, entityKey, type Boundary } from "foldkit-remote"
import { RemoteServer, RemoteServerError } from "foldkit-remote-server"
import {
    ChangeTransactionalCopy,
    DeleteNewsletterDraft,
    MailRemote,
    PublicationEmailTheme,
    PublicationEmailThemeQuery,
    NewsletterCatalog,
    NewsletterTemplateCatalog,
    SaveNewsletterDraft,
    SaveNewsletterTemplate,
    SendNewsletter,
    SendTransactionalEmail,
    SetSubscription,
    SubscriptionCatalog,
    TransactionalCatalog,
} from "@urm/contracts/mail"
import { subscription_catalog_id } from "@urm/domain/mail-subscriptions"
import { newsletter_template_catalog_id } from "@urm/domain/mail-templates"
import {
    SubscriptionsRepository,
    type SubscriptionsPrincipal,
} from "./repository.ts"

const denied = () =>
    new RemoteServerError({
        message: "The subscriber list is unavailable or access was denied.",
    })
const terminal: Boundary = { _tag: "Terminal" }

// The catalog id carries the list key, so a read names the list it wants while
// the workspace still comes from the principal, never from the requested id.
const list_key_of = (id: string, domain_id: string) => {
    const prefix = `${domain_id}/`
    return id.startsWith(prefix) ? id.slice(prefix.length) : null
}

export const SubscriptionsServer = RemoteServer.make({
    entities: [
        RemoteServer.entity<SubscriptionsPrincipal, SubscriptionsRepository>(
            PublicationEmailTheme,
            {
                read: ({ ids, principal }) =>
                    Effect.gen(function* () {
                        if (ids.some((id) => id !== principal.domain_id))
                            return yield* Effect.fail(denied())
                        return ids.length === 0
                            ? []
                            : [
                                  {
                                      id: principal.domain_id,
                                      values: yield* Effect.flatMap(
                                          SubscriptionsRepository,
                                          (repository) =>
                                              repository.load_publication_theme(
                                                  principal
                                              )
                                      ),
                                  },
                              ]
                    }).pipe(Effect.mapError(denied)),
            }
        ),
        RemoteServer.entity<SubscriptionsPrincipal, SubscriptionsRepository>(
            SubscriptionCatalog,
            {
                read: ({ ids, principal }) =>
                    Effect.gen(function* () {
                        const repository = yield* SubscriptionsRepository
                        return yield* Effect.forEach(ids, (id) =>
                            Effect.gen(function* () {
                                const list_key = list_key_of(
                                    id,
                                    principal.domain_id
                                )
                                if (list_key === null || list_key === "")
                                    return yield* Effect.fail(denied())
                                return {
                                    id,
                                    values: yield* repository.load_catalog(
                                        principal,
                                        list_key
                                    ),
                                }
                            })
                        )
                    }).pipe(Effect.mapError(denied)),
            }
        ),
        RemoteServer.entity<SubscriptionsPrincipal, SubscriptionsRepository>(
            NewsletterTemplateCatalog,
            {
                read: ({ ids, principal }) =>
                    Effect.gen(function* () {
                        const repository = yield* SubscriptionsRepository
                        const id = newsletter_template_catalog_id(
                            principal.domain_id
                        )
                        if (ids.some((requested) => requested !== id))
                            return yield* Effect.fail(denied())
                        return ids.length === 0
                            ? []
                            : [
                                  {
                                      id,
                                      values: yield* repository.load_templates(
                                          principal
                                      ),
                                  },
                              ]
                    }).pipe(Effect.mapError(denied)),
            }
        ),
        RemoteServer.entity<SubscriptionsPrincipal, SubscriptionsRepository>(
            NewsletterCatalog,
            {
                read: ({ ids, principal }) =>
                    Effect.gen(function* () {
                        const repository = yield* SubscriptionsRepository
                        return yield* Effect.forEach(ids, (id) =>
                            Effect.gen(function* () {
                                const prefix = `${principal.domain_id}/newsletter/`
                                if (!id.startsWith(prefix))
                                    return yield* Effect.fail(denied())
                                return {
                                    id,
                                    values: yield* repository.load_newsletter(
                                        principal,
                                        id.slice(prefix.length)
                                    ),
                                }
                            })
                        )
                    }).pipe(Effect.mapError(denied)),
            }
        ),
        RemoteServer.entity<SubscriptionsPrincipal, SubscriptionsRepository>(
            TransactionalCatalog,
            {
                read: ({ ids, principal }) =>
                    Effect.gen(function* () {
                        const repository = yield* SubscriptionsRepository
                        return yield* Effect.forEach(ids, (id) =>
                            Effect.gen(function* () {
                                // `<domain>/transactional` optionally followed
                                // by `/<template_id>/<before_version>` when the
                                // editor is paging a template's history.
                                const prefix = `${principal.domain_id}/transactional`
                                if (!id.startsWith(prefix))
                                    return yield* Effect.fail(denied())
                                const rest = id.slice(prefix.length)
                                const [, template_id, before] = rest.split("/")
                                return {
                                    id,
                                    values: yield* repository.load_transactional(
                                        principal,
                                        template_id ?? null,
                                        before === undefined || before === ""
                                            ? null
                                            : Number(before)
                                    ),
                                }
                            })
                        )
                    }).pipe(Effect.mapError(denied)),
            }
        ),
    ],
    queries: [
        RemoteServer.query(
            PublicationEmailThemeQuery,
            ({
                input,
                principal,
            }: {
                input: typeof PublicationEmailThemeQuery.Input.Type
                principal: SubscriptionsPrincipal
            }) =>
                Effect.gen(function* () {
                    if (input.domain_id !== principal.domain_id)
                        return yield* Effect.fail(denied())
                    yield* Effect.flatMap(
                        SubscriptionsRepository,
                        (repository) =>
                            repository.load_publication_theme(principal)
                    )
                    return {
                        edges: [
                            {
                                entity: PublicationEmailTheme.name,
                                id: principal.domain_id,
                                key: entityKey(
                                    PublicationEmailTheme.name,
                                    principal.domain_id
                                ),
                            },
                        ],
                        start: terminal,
                        end: terminal,
                    }
                }).pipe(Effect.mapError(denied))
        ),
    ],
    mutations: [
        RemoteServer.mutation(
            ChangeTransactionalCopy,
            ({
                input,
                principal,
            }: {
                input: typeof ChangeTransactionalCopy.Input.Type
                principal: SubscriptionsPrincipal
            }) =>
                Effect.gen(function* () {
                    if (input.domain_id !== principal.domain_id)
                        return yield* Effect.fail(denied())
                    const repository = yield* SubscriptionsRepository
                    const templates = yield* repository.change_transactional(
                        principal,
                        input.operation
                    )
                    return {
                        output: {
                            template_id: input.operation.template_id,
                            templates,
                        },
                        entities: [],
                    }
                }).pipe(Effect.mapError(denied))
        ),
        RemoteServer.mutation(
            SendTransactionalEmail,
            ({
                input,
                principal,
            }: {
                input: typeof SendTransactionalEmail.Input.Type
                principal: SubscriptionsPrincipal
            }) =>
                Effect.gen(function* () {
                    if (input.domain_id !== principal.domain_id)
                        return yield* Effect.fail(denied())
                    const repository = yield* SubscriptionsRepository
                    const delivery = yield* repository.send_transactional(
                        principal,
                        input.send
                    )
                    return { output: delivery, entities: [] }
                }).pipe(Effect.mapError(denied))
        ),
        RemoteServer.mutation(
            SaveNewsletterDraft,
            ({
                input,
                principal,
            }: {
                input: typeof SaveNewsletterDraft.Input.Type
                principal: SubscriptionsPrincipal
            }) =>
                Effect.gen(function* () {
                    if (input.domain_id !== principal.domain_id)
                        return yield* Effect.fail(denied())
                    const repository = yield* SubscriptionsRepository
                    const drafts = yield* repository.save_draft(
                        principal,
                        input.draft
                    )
                    return {
                        output: { id: input.draft.id, drafts },
                        entities: [],
                    }
                }).pipe(Effect.mapError(denied))
        ),
        RemoteServer.mutation(
            DeleteNewsletterDraft,
            ({
                input,
                principal,
            }: {
                input: typeof DeleteNewsletterDraft.Input.Type
                principal: SubscriptionsPrincipal
            }) =>
                Effect.gen(function* () {
                    if (input.domain_id !== principal.domain_id)
                        return yield* Effect.fail(denied())
                    const repository = yield* SubscriptionsRepository
                    const drafts = yield* repository.delete_draft(
                        principal,
                        input.draft_id
                    )
                    return {
                        output: { id: input.draft_id, drafts },
                        entities: [],
                    }
                }).pipe(Effect.mapError(denied))
        ),
        RemoteServer.mutation(
            SendNewsletter,
            ({
                input,
                principal,
            }: {
                input: typeof SendNewsletter.Input.Type
                principal: SubscriptionsPrincipal
            }) =>
                Effect.gen(function* () {
                    if (input.domain_id !== principal.domain_id)
                        return yield* Effect.fail(denied())
                    const repository = yield* SubscriptionsRepository
                    const sends = yield* repository.send_newsletter(
                        principal,
                        input.send
                    )
                    return {
                        output: { id: input.send.draft_id, sends },
                        entities: [],
                    }
                }).pipe(Effect.mapError(denied))
        ),
        RemoteServer.mutation(
            SaveNewsletterTemplate,
            ({
                input,
                principal,
            }: {
                input: typeof SaveNewsletterTemplate.Input.Type
                principal: SubscriptionsPrincipal
            }) =>
                Effect.gen(function* () {
                    if (input.domain_id !== principal.domain_id)
                        return yield* Effect.fail(denied())
                    const repository = yield* SubscriptionsRepository
                    const catalog = yield* repository.save_template(
                        principal,
                        input.template
                    )
                    return {
                        output: {
                            id: input.template.id,
                            templates: catalog.templates,
                        },
                        entities: [
                            Entity.patch(
                                NewsletterTemplateCatalog.ref(catalog.id),
                                catalog
                            ),
                        ],
                    }
                }).pipe(Effect.mapError(denied))
        ),
        RemoteServer.mutation(
            SetSubscription,
            ({
                input,
                principal,
            }: {
                input: typeof SetSubscription.Input.Type
                principal: SubscriptionsPrincipal
            }) =>
                Effect.gen(function* () {
                    if (input.domain_id !== principal.domain_id)
                        return yield* Effect.fail(denied())
                    const repository = yield* SubscriptionsRepository
                    const catalog = yield* repository.set_status(
                        principal,
                        input.subscription
                    )
                    return {
                        output: {
                            contact_id: input.subscription.contact_id,
                            list_key: catalog.list_key,
                            subscriptions: catalog.subscriptions,
                        },
                        entities: [
                            Entity.patch(
                                SubscriptionCatalog.ref(catalog.id),
                                catalog
                            ),
                        ],
                    }
                }).pipe(Effect.mapError(denied))
        ),
    ],
})

RemoteServer.validate(MailRemote, SubscriptionsServer)

export { subscription_catalog_id }
