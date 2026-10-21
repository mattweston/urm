import { ChatServer } from "./handlers/chat/index.ts"
import { DataServer } from "./handlers/data/remote.ts"
import { FormsServer } from "./handlers/forms/remote.ts"
import { LandingTemplatesServer } from "./handlers/landing-templates/remote.ts"
import { LogoDraftsServer } from "./handlers/logo-drafts/remote.ts"
import { AccountPreferencesServer } from "./handlers/account-preferences/remote.ts"
import { SysadminSessionsServer } from "./handlers/sysadmin/account-sessions.ts"
import { SysadminTelemetryServer } from "./handlers/sysadmin/account-telemetry.ts"
import { SysadminProcessServer } from "./handlers/sysadmin/account-process.ts"
import { SysadminTelemetryWriter } from "./handlers/sysadmin/telemetry-write.ts"
import { SocialServer } from "./handlers/social/remote.ts"
import { SubscriptionsServer } from "./handlers/mail/remote.ts"
import { ProjectsServer } from "./handlers/projects/remote.ts"
import { IssuesServer } from "./handlers/issues/remote.ts"
import { EventsServer } from "./handlers/events/remote.ts"
import { SubdomainsServer } from "./handlers/subdomains/index.ts"
import { ConfigurationServer } from "./handlers/publication-config/index.ts"
import { RepositoriesLive } from "./repositories.ts"
import { Effect, Exit, Layer } from "effect"
import {
    RemoteReadError,
    RemoteQueryError,
    RemoteMutationError,
} from "foldkit-remote"
import { RemoteServer } from "foldkit-remote-server"
import { authenticate_token, session_token, AuthError } from "@urm/auth"
import { RpcApi } from "@urm/contracts/rpc"
import {
    ContactsServer,
    type ContactsPrincipal,
} from "./handlers/contacts/index.ts"
import { PublishingServer } from "./handlers/publishing/index.ts"
import { PagesServer } from "./handlers/pages/index.ts"
import { BlogServer } from "./handlers/blog/index.ts"
import { ShopCatalogServer } from "./handlers/shop/catalog-remote.ts"
import { ShopCartServer } from "./handlers/shop/cart-remote.ts"
import { ShopOrderServer } from "./handlers/shop/order-remote.ts"
import { DocumentsServer } from "./handlers/documents/index.ts"
import { BookmarksServer } from "./handlers/bookmarks/index.ts"
import { TagsServer } from "./handlers/tags/index.ts"
import { MediaServer } from "./handlers/media/index.ts"
import { MembersServer } from "./handlers/members/index.ts"
import { authenticated_rpc_layer } from "./auth/index.ts"

const server = RemoteServer.make<
    ContactsPrincipal,
    Layer.Success<typeof RepositoriesLive>
>({
    entities: [
        ...AccountPreferencesServer.entities.values(),
        ...DataServer.entities.values(),
        ...FormsServer.entities.values(),
        ...LandingTemplatesServer.entities.values(),
        ...LogoDraftsServer.entities.values(),
        ...SysadminSessionsServer.entities.values(),
        ...SysadminTelemetryServer.entities.values(),
        ...SysadminProcessServer.entities.values(),
        ...SocialServer.entities.values(),
        ...ChatServer.entities.values(),
        ...SubscriptionsServer.entities.values(),
        ...EventsServer.entities.values(),
        ...IssuesServer.entities.values(),
        ...ProjectsServer.entities.values(),
        ...SubdomainsServer.entities.values(),
        ...ContactsServer.entities.values(),
        ...MembersServer.entities.values(),
        ...MediaServer.entities.values(),
        ...TagsServer.entities.values(),
        ...BookmarksServer.entities.values(),
        ...DocumentsServer.entities.values(),
        ...BlogServer.entities.values(),
        ...ShopCatalogServer.entities.values(),
        ...ShopCartServer.entities.values(),
        ...ShopOrderServer.entities.values(),
        ...PagesServer.entities.values(),
        ...ConfigurationServer.entities.values(),
        ...PublishingServer.entities.values(),
    ],
    queries: [
        ...AccountPreferencesServer.queries.values(),
        ...DataServer.queries.values(),
        ...FormsServer.queries.values(),
        ...LandingTemplatesServer.queries.values(),
        ...LogoDraftsServer.queries.values(),
        ...SysadminSessionsServer.queries.values(),
        ...SysadminTelemetryServer.queries.values(),
        ...SysadminProcessServer.queries.values(),
        ...SocialServer.queries.values(),
        ...SubscriptionsServer.queries.values(),
        ...EventsServer.queries.values(),
        ...IssuesServer.queries.values(),
        ...ProjectsServer.queries.values(),
        ...SubdomainsServer.queries.values(),
        ...ContactsServer.queries.values(),
        ...MembersServer.queries.values(),
        ...MediaServer.queries.values(),
        ...TagsServer.queries.values(),
        ...BookmarksServer.queries.values(),
        ...DocumentsServer.queries.values(),
        ...BlogServer.queries.values(),
        ...ShopCatalogServer.queries.values(),
        ...ShopCartServer.queries.values(),
        ...ShopOrderServer.queries.values(),
        ...PagesServer.queries.values(),
        ...ConfigurationServer.queries.values(),
        ...PublishingServer.queries.values(),
    ],
    mutations: [
        ...AccountPreferencesServer.mutations.values(),
        ...SocialServer.mutations.values(),
        ...DataServer.mutations.values(),
        ...FormsServer.mutations.values(),
        ...LandingTemplatesServer.mutations.values(),
        ...LogoDraftsServer.mutations.values(),
        ...ChatServer.mutations.values(),
        ...SubscriptionsServer.mutations.values(),
        ...EventsServer.mutations.values(),
        ...IssuesServer.mutations.values(),
        ...ProjectsServer.mutations.values(),
        ...SubdomainsServer.mutations.values(),
        ...ContactsServer.mutations.values(),
        ...MembersServer.mutations.values(),
        ...MediaServer.mutations.values(),
        ...TagsServer.mutations.values(),
        ...BookmarksServer.mutations.values(),
        ...DocumentsServer.mutations.values(),
        ...BlogServer.mutations.values(),
        ...ShopCatalogServer.mutations.values(),
        ...ShopCartServer.mutations.values(),
        ...ShopOrderServer.mutations.values(),
        ...PagesServer.mutations.values(),
        ...ConfigurationServer.mutations.values(),
        ...PublishingServer.mutations.values(),
    ],
})
export const api_handlers = (principal: ContactsPrincipal) =>
    RemoteServer.handlers(server, principal, {
        maxIdsPerEntity: 200,
        maxDepth: 1,
    })

export const api_request_layer = (request: Request) =>
    Layer.mergeAll(
        authenticated_rpc_layer(request),
        RpcApi.toLayer(
            Effect.gen(function* () {
                const principal = yield* Effect.cached(
                    Effect.gen(function* () {
                        const account = yield* authenticate_token(
                            session_token(request)
                        )
                        const domain_id = new URL(request.url).searchParams.get(
                            "domain_id"
                        )
                        if (domain_id === null)
                            return yield* Effect.fail(
                                new AuthError({ reason: "forbidden" })
                            )
                        return { ...account, domain_id }
                    })
                )
                return RpcApi.of({
                    FoldkitRemoteRead: (input) =>
                        principal.pipe(
                            Effect.flatMap((scope) =>
                                api_handlers(scope)
                                    .FoldkitRemoteRead(input)
                                    .pipe(Effect.provide(RepositoriesLive))
                            ),
                            Effect.mapError((error) =>
                                input.requests.some((request) =>
                                    [
                                        "SocialAccounts",
                                        "SocialPosts",
                                        "SocialTemplates",
                                        "SocialAnalytics",
                                    ].includes(request.entity)
                                ) && error instanceof RemoteReadError
                                    ? error
                                    : new RemoteReadError({
                                          message:
                                              "Read unavailable or access denied",
                                      })
                            )
                        ),
                    FoldkitRemoteQuery: (input) =>
                        principal.pipe(
                            Effect.flatMap((scope) => {
                                const started_at = Date.now()
                                return api_handlers(scope)
                                    .FoldkitRemoteQuery(input)
                                    .pipe(
                                        Effect.tap(() =>
                                            Effect.gen(function* () {
                                                const writer =
                                                    yield* SysadminTelemetryWriter
                                                yield* writer.record_query(
                                                    scope,
                                                    input.query,
                                                    started_at
                                                )
                                            }).pipe(
                                                Effect.catchCause(
                                                    () => Effect.void
                                                )
                                            )
                                        ),
                                        Effect.provide(RepositoriesLive)
                                    )
                            }),
                            Effect.mapError((error) => {
                                const sysadmin_query = [
                                    "SysadminTelemetryQuery",
                                    "SysadminSessionsQuery",
                                    "SysadminProcessQuery",
                                    "DomainSocialAccounts",
                                    "DomainSocialPosts",
                                    "DomainSocialTemplates",
                                    "DomainSocialAnalytics",
                                    "AccountPreferencesQuery",
                                    "AccountNavigationQuery",
                                ].includes(input.query)
                                if (sysadmin_query)
                                    return new RemoteQueryError({
                                        message:
                                            error instanceof RemoteQueryError
                                                ? error.message
                                                : error instanceof AuthError
                                                  ? "Authentication required"
                                                  : "Sysadmin data unavailable",
                                    })
                                return new RemoteQueryError({
                                    message:
                                        "Query unavailable or access denied",
                                })
                            })
                        ),
                    FoldkitRemoteMutate: (input) =>
                        principal.pipe(
                            Effect.flatMap((scope) => {
                                const started_at = Date.now()
                                return api_handlers(scope)
                                    .FoldkitRemoteMutate(input)
                                    .pipe(
                                        Effect.onExit((exit) =>
                                            Effect.gen(function* () {
                                                const writer =
                                                    yield* SysadminTelemetryWriter
                                                if (Exit.isSuccess(exit))
                                                    yield* writer.record_success(
                                                        scope,
                                                        input.mutation,
                                                        started_at
                                                    )
                                                else
                                                    yield* writer.record_failure(
                                                        scope,
                                                        input.mutation,
                                                        started_at
                                                    )
                                            }).pipe(
                                                Effect.catchCause(
                                                    () => Effect.void
                                                )
                                            )
                                        ),
                                        Effect.provide(RepositoriesLive)
                                    )
                            }),
                            Effect.mapError((error) =>
                                [
                                    "BuildPublication",
                                    "DeployDevelopment",
                                    "CancelDeployment",
                                    "SyncSocialAccounts",
                                    "ConnectSocialAccount",
                                    "SaveSocialTemplate",
                                    "RefreshSocialAnalytics",
                                    "SubmitSocialPost",
                                    "CancelSocialPost",
                                    "UpdateSocialDraft",
                                    "ReconcileSocialPost",
                                    "RetrySocialDraftEdit",
                                    "SaveAccountAppearance",
                                    "SaveAccountSpotify",
                                    "SaveAccountSidebar",
                                    "SaveAccountModules",
                                ].includes(input.mutation) &&
                                error instanceof RemoteMutationError
                                    ? error
                                    : new RemoteMutationError({
                                          message:
                                              "Mutation unavailable or access denied",
                                      })
                            )
                        ),
                })
            })
        )
    )
