import {
    UploadedImage,
    image_upload_limit,
    image_upload_types,
} from "@urm/contracts/uploads"
import { RpcApi } from "@urm/contracts/rpc"
import { Context, Effect, Layer, Schema, Stream } from "effect"
import {
    FetchHttpClient,
    HttpClient,
    HttpClientRequest,
} from "effect/unstable/http"
import { RpcClient, RpcSerialization } from "effect/unstable/rpc"
import {
    Remote,
    RemoteReadError,
    RemoteQueryError,
    RemoteMutationError,
    RemoteLiveError,
    type RemoteClient,
} from "foldkit-remote"
import { ImportRemoteContacts } from "@urm/contracts/contacts"
import {
    AccountSession,
    AccountDomains,
    BreachCheckResult,
} from "@urm/contracts/auth"

export class AccountRequestError extends Schema.TaggedErrorClass<AccountRequestError>()(
    "AccountRequestError",
    {
        status: Schema.Number,
        message: Schema.String,
    }
) {}
export class ContactsApi extends Context.Service<
    ContactsApi,
    {
        readonly import_rows: (input: {
            slug: string
            source_id: string
            rows: (typeof ImportRemoteContacts.Input.Type)["rows"]
        }) => Effect.Effect<number, AccountRequestError>
        readonly session: () => Effect.Effect<
            AccountDomains,
            AccountRequestError
        >
        readonly account: () => Effect.Effect<
            AccountSession,
            AccountRequestError
        >
        readonly check_email_breaches: (
            email: string
        ) => Effect.Effect<BreachCheckResult, AccountRequestError>
        readonly login: () => Effect.Effect<AccountDomains, AccountRequestError>
        readonly logout: () => Effect.Effect<void, AccountRequestError>
        readonly create_domain: (input: {
            name: string
            slug: string
        }) => Effect.Effect<AccountDomains, AccountRequestError>
        readonly update_domain: (input: {
            domain_id: string
            name: string
            slug: string
        }) => Effect.Effect<AccountDomains, AccountRequestError>
        readonly delete_domain: (input: {
            domain_id: string
        }) => Effect.Effect<AccountDomains, AccountRequestError>
        readonly upload_image: (
            domain_id: string,
            file: File,
            module?:
                | "Mail"
                | "Media"
                | "Documents"
                | "Blog"
                | "Pages"
                | "Events"
                | "Shop"
        ) => Effect.Effect<string, AccountRequestError>
        readonly remote: (domain_id: string) => Layer.Layer<RemoteClient>
    }
>()("ContactsApi") {}

export const browser_api = (
    origin: string,
    read_credentials: () => { email: string; password: string },
    fetch_impl: typeof fetch = fetch
) => {
    const request = Effect.fn("Contacts.accountRequest")(function* (
        path: string,
        body?: unknown
    ) {
        const result = yield* Effect.tryPromise({
            try: (signal) =>
                fetch_impl(new URL(path, origin), {
                    method: body === undefined ? "GET" : "POST",
                    credentials: "same-origin",
                    signal,
                    headers: {
                        "x-requested-with": "XMLHttpRequest",
                        "content-type": "application/json",
                    },
                    ...(body === undefined
                        ? {}
                        : { body: JSON.stringify(body) }),
                }),
            catch: () =>
                new AccountRequestError({
                    status: 0,
                    message: "Cannot reach the server. Try again.",
                }),
        })
        if (!result.ok)
            return yield* Effect.fail(
                new AccountRequestError({
                    status: result.status,
                    message:
                        result.status === 401
                            ? "Sign in to continue."
                            : result.status === 429
                              ? "Too many sign-in attempts. Try again later."
                              : result.status === 503
                                ? "The account service is unavailable. Try again."
                                : `Account request failed (${result.status}). Try again.`,
                })
            )
        const payload: unknown = yield* Effect.tryPromise({
            try: () => result.json(),
            catch: () =>
                new AccountRequestError({
                    status: 0,
                    message: "The server returned an invalid response.",
                }),
        })
        return payload
    })
    const session = Effect.fn("Contacts.session")(function* () {
        return yield* Schema.decodeUnknownEffect(AccountDomains)(
            yield* request("/auth/domains")
        ).pipe(
            Effect.mapError(
                () =>
                    new AccountRequestError({
                        status: 0,
                        message: "The domain response was invalid.",
                    })
            )
        )
    })
    const account = Effect.fn("Contacts.account")(function* () {
        return yield* Schema.decodeUnknownEffect(AccountSession)(
            yield* request("/auth/me")
        ).pipe(
            Effect.mapError(
                () =>
                    new AccountRequestError({
                        status: 0,
                        message: "The account response was invalid.",
                    })
            )
        )
    })
    const check_email_breaches = Effect.fn("Contacts.checkEmailBreaches")(
        function* (email: string) {
            return yield* Schema.decodeUnknownEffect(BreachCheckResult)(
                yield* request("/auth/breach-check", { email })
            ).pipe(
                Effect.mapError(
                    () =>
                        new AccountRequestError({
                            status: 0,
                            message: "The breach check response was invalid.",
                        })
                )
            )
        }
    )
    const login = Effect.fn("Contacts.login")(function* () {
        const credentials = yield* Effect.try({
            try: read_credentials,
            catch: () =>
                new AccountRequestError({
                    status: 0,
                    message: "Enter your email and password.",
                }),
        })
        yield* request("/auth/login", credentials).pipe(
            Effect.mapError((error) =>
                error.status === 401
                    ? new AccountRequestError({
                          status: 401,
                          message: "Email or password is incorrect.",
                      })
                    : error
            )
        )
        return yield* session()
    })
    const domain_mutation = Effect.fn("Contacts.domainMutation")(function* (
        path: string,
        input: unknown
    ) {
        return yield* Schema.decodeUnknownEffect(AccountDomains)(
            yield* request(path, input)
        ).pipe(
            Effect.mapError(
                () =>
                    new AccountRequestError({
                        status: 0,
                        message: "The domain response was invalid.",
                    })
            )
        )
    })
    const upload_image = Effect.fn("Uploads.image")(function* (
        domain_id: string,
        file: File,
        module:
            | "Mail"
            | "Media"
            | "Documents"
            | "Blog"
            | "Pages"
            | "Events"
            | "Shop" = "Mail"
    ) {
        if (
            file.size === 0 ||
            file.size > image_upload_limit ||
            !image_upload_types.includes(file.type)
        ) {
            return yield* Effect.fail(
                new AccountRequestError({
                    status: 400,
                    message:
                        "Choose a PNG, JPEG, WebP or GIF image smaller than 1 MB.",
                })
            )
        }
        const url = new URL("/api/uploads", origin)
        url.searchParams.set("domain_id", domain_id)
        url.searchParams.set("module", module)
        const result = yield* Effect.tryPromise({
            try: (signal) =>
                fetch_impl(url, {
                    method: "POST",
                    credentials: "same-origin",
                    signal,
                    headers: {
                        "x-requested-with": "XMLHttpRequest",
                        "content-type": file.type,
                    },
                    body: file,
                }),
            catch: () =>
                new AccountRequestError({
                    status: 0,
                    message:
                        "Upload failed. Check your connection and try again.",
                }),
        })
        if (!result.ok) {
            const message = yield* Effect.tryPromise(() => result.json()).pipe(
                Effect.flatMap(
                    Schema.decodeUnknownEffect(
                        Schema.Struct({ error: Schema.String })
                    )
                ),
                Effect.map((payload) => payload.error),
                Effect.catch(() =>
                    Effect.succeed("Image storage is unavailable. Try again.")
                )
            )
            return yield* Effect.fail(
                new AccountRequestError({
                    status: result.status,
                    message:
                        result.status === 413
                            ? "Choose an image smaller than 1 MB."
                            : message,
                })
            )
        }
        const payload: unknown = yield* Effect.tryPromise({
            try: () => result.json(),
            catch: () =>
                new AccountRequestError({
                    status: 0,
                    message: "Invalid upload response.",
                }),
        })
        const image = yield* Schema.decodeUnknownEffect(UploadedImage)(
            payload
        ).pipe(
            Effect.mapError(
                () =>
                    new AccountRequestError({
                        status: 0,
                        message: "Invalid upload response.",
                    })
            )
        )
        return image.url
    })
    const remote = (domain_id: string) => {
        const protocol = RpcClient.layerProtocolHttp({
            url: new URL("/api/rpc", origin).href,
            transformClient: (client) =>
                HttpClient.mapRequest(client, (request) =>
                    request.pipe(
                        HttpClientRequest.setHeader(
                            "x-requested-with",
                            "XMLHttpRequest"
                        ),
                        HttpClientRequest.setUrlParam("domain_id", domain_id)
                    )
                ),
        }).pipe(
            Layer.provide(
                FetchHttpClient.layer.pipe(
                    Layer.provide(
                        Layer.succeed(FetchHttpClient.Fetch, fetch_impl)
                    ),
                    Layer.provide(
                        Layer.succeed(FetchHttpClient.RequestInit, {
                            credentials: "same-origin",
                        })
                    )
                )
            ),
            Layer.provide(RpcSerialization.layerNdjson)
        )
        return Layer.unwrap(
            Effect.gen(function* () {
                const client = yield* RpcClient.make(RpcApi)
                return Remote.clientLayer({
                    FoldkitRemoteRead: (input) =>
                        client.FoldkitRemoteRead(input).pipe(
                            Effect.mapError((error) =>
                                input.requests.some((request) =>
                                    [
                                        "SocialAccounts",
                                        "SocialPosts",
                                        "SocialTemplates",
                                        "SocialAnalytics",
                                        "AccountPreferences",
                                        "AccountNavigation",
                                    ].includes(request.entity)
                                ) && error instanceof RemoteReadError
                                    ? error
                                    : new RemoteReadError({
                                          message:
                                              "Contacts could not be loaded.",
                                      })
                            )
                        ),
                    FoldkitRemoteQuery: (input) =>
                        client.FoldkitRemoteQuery(input).pipe(
                            Effect.mapError((error) =>
                                [
                                    "SysadminTelemetryQuery",
                                    "SysadminSessionsQuery",
                                    "SysadminProcessQuery",
                                    "DomainSocialAccounts",
                                    "DomainSocialPosts",
                                    "DomainSocialTemplates",
                                    "DomainSocialAnalytics",
                                    "AccountPreferencesQuery",
                                    "AccountNavigationQuery",
                                ].includes(input.query) &&
                                error instanceof RemoteQueryError
                                    ? error
                                    : new RemoteQueryError({
                                          message:
                                              "Contacts could not be loaded.",
                                      })
                            )
                        ),
                    FoldkitRemoteMutate: (input) =>
                        client.FoldkitRemoteMutate(input).pipe(
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
                                              "Contact could not be saved.",
                                      })
                            )
                        ),
                    FoldkitRemoteLive: () =>
                        Stream.fail(
                            new RemoteLiveError({
                                message: "Live updates are unavailable.",
                            })
                        ),
                })
            })
        ).pipe(Layer.provide(protocol))
    }
    const import_rows = Effect.fn("Contacts.importRows")(function* (input: {
        slug: string
        source_id: string
        rows: (typeof ImportRemoteContacts.Input.Type)["rows"]
    }) {
        const account = yield* session().pipe(
            Effect.mapError((error) =>
                error.status === 401
                    ? new AccountRequestError({
                          status: 401,
                          message:
                              "Sign in to Contacts for this domain before importing.",
                      })
                    : error
            )
        )
        const domain = account.domains.find(
            (item) => item.slug === input.slug && item.can_write
        )
        if (domain === undefined)
            return yield* Effect.fail(
                new AccountRequestError({
                    status: 403,
                    message:
                        "Your Contacts account cannot import into this domain.",
                })
            )
        const result = yield* Remote.mutate(
            ImportRemoteContacts,
            {
                domain_id: domain.id,
                source_id: input.source_id,
                rows: input.rows,
            },
            crypto.randomUUID()
        ).pipe(
            Effect.provide(remote(domain.id)),
            Effect.mapError(
                () =>
                    new AccountRequestError({
                        status: 400,
                        message:
                            "Contacts import failed. Check field values, duplicate emails and domain access. No contacts were added.",
                    })
            )
        )
        if (result.output.already_imported)
            return yield* Effect.fail(
                new AccountRequestError({
                    status: 409,
                    message:
                        "This CSV was already imported into Contacts. No rows were added.",
                })
            )
        return result.output.imported
    })
    return Layer.succeed(
        ContactsApi,
        ContactsApi.of({
            upload_image,
            import_rows,
            session,
            account,
            check_email_breaches,
            login,
            logout: () => request("/auth/logout", {}).pipe(Effect.asVoid),
            create_domain: (input) =>
                domain_mutation("/auth/domains/create", input),
            update_domain: (input) =>
                domain_mutation("/auth/domains/update", input),
            delete_domain: (input) =>
                domain_mutation("/auth/domains/delete", input),
            remote,
        })
    )
}
