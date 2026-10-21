/** # Image routes
 * Private reads use the workspace upload boundary; legacy unowned keys cannot
 * establish permission to read an object.
 */
import { resolveImageUrl } from "@urm/utils/upload"
import { handle_upload_request } from "@urm/http"
import { toOperationError } from "@urm/utils"
import { authenticate_token, session_token } from "@urm/auth"
import {
    isTrustedDomainWorkerRequest,
    resolveDomainSessionScope,
} from "@urm/auth/legacy"
import { AuthConfig } from "@urm/env/server"
import { Effect, Redacted } from "effect"

export type AuthenticatedAccountIdLookup<Requirements = never> = (
    request: Request
) => Effect.Effect<string | undefined, never, Requirements>

export type PublicDomainImageLookup<Requirements = never, Failure = never> = (
    domainId: string,
    resourceId: string
) => Effect.Effect<string | undefined, Failure, Requirements>

export type PublicDomainScope = Readonly<{
    domain_id: string
}>

export type PublicDomainScopeLookup<Requirements = never, Failure = never> = (
    hostname: string
) => Effect.Effect<PublicDomainScope | undefined, Failure, Requirements>

const authenticatedAccountId = (request: Request) =>
    authenticate_token(session_token(request)).pipe(
        Effect.map((principal) => principal.account_id),
        Effect.catch(() => Effect.succeed(undefined))
    )

const authenticationRequiredResponse = (): Response =>
    Response.json({ error: "Authentication required" }, { status: 401 })

const unavailableResponse = (): Response =>
    new Response(null, {
        status: 404,
        headers: { "Cache-Control": "no-store" },
    })

/**
 * Retires uploads without a workspace key: their later readers cannot establish
 * ownership. New uploads must use the authorized workspace endpoint.
 */
export const makeUploadRoute =
    <Requirements>(
        getAuthenticatedAccountId: AuthenticatedAccountIdLookup<Requirements>
    ) =>
    (request: Request) =>
        Effect.gen(function* () {
            const account_id = yield* getAuthenticatedAccountId(request)

            if (account_id === undefined) {
                return authenticationRequiredResponse()
            }

            return Response.json(
                { error: "Use the workspace upload endpoint /api/uploads." },
                { status: 410, headers: { "Cache-Control": "no-store" } }
            )
        })

/**
 * Resolves stored image references through the private workspace read handler.
 * A signed storage URL grants access, so authentication alone is insufficient:
 * the handler must verify current workspace membership and module permissions.
 * Legacy keys without workspace ownership are rejected rather than signed.
 */
export const makeImageUrlRoute =
    <Requirements, ImageRequirements>(
        getAuthenticatedAccountId: AuthenticatedAccountIdLookup<Requirements>,
        read_private_image: (
            request: Request
        ) => Effect.Effect<Response, never, ImageRequirements>
    ) =>
    (request: Request) =>
        Effect.gen(function* () {
            const account_id = yield* getAuthenticatedAccountId(request)

            if (account_id === undefined) {
                return authenticationRequiredResponse()
            }

            const url = new URL(request.url)
            const storedUrl = url.searchParams.get("url")

            if (storedUrl === null || storedUrl === "") {
                return new Response("Missing url query parameter", {
                    status: 400,
                    headers: { "Content-Type": "text/plain; charset=utf-8" },
                })
            }

            const stored = URL.parse(storedUrl)
            const match =
                stored === null
                    ? null
                    : /^\/[^/]+\/domains\/([^/]+)\/(media\/|documents\/|blog\/|pages\/|events\/|shop\/)?images\/([0-9a-f-]{36})$/.exec(
                          stored.pathname
                      )
            if (match === null) return unavailableResponse()
            const target = new URL(request.url)
            target.pathname = `/api/uploads/${match[1]}/${match[2] ?? ""}${match[3]}`
            target.search = ""
            return yield* read_private_image(
                new Request(target, {
                    headers: request.headers,
                })
            )
        })

/** Resolve a private image only after its public domain resource is verified. */
export const makeTrustedPublicDomainImageRoute =
    <ScopeRequirements, ScopeFailure, ImageRequirements, ImageFailure>(
        resourceIdParameter: string,
        resolveDomainScope: PublicDomainScopeLookup<
            ScopeRequirements,
            ScopeFailure
        >,
        findPublicDomainImage: PublicDomainImageLookup<
            ImageRequirements,
            ImageFailure
        >
    ) =>
    (request: Request) =>
        Effect.gen(function* () {
            const authConfig = yield* AuthConfig
            const hostname = request.headers.get("x-urm-original-host")

            if (
                hostname === null ||
                !isTrustedDomainWorkerRequest(
                    request.headers,
                    Redacted.value(authConfig.domainWorkerToken)
                )
            ) {
                return unavailableResponse()
            }

            const domainScope = yield* resolveDomainScope(hostname).pipe(
                Effect.catch(() => Effect.succeed(undefined))
            )

            if (domainScope === undefined) {
                return unavailableResponse()
            }

            const resourceId = new URL(request.url).searchParams.get(
                resourceIdParameter
            )

            if (resourceId === null || resourceId === "") {
                return unavailableResponse()
            }

            const storedUrl = yield* findPublicDomainImage(
                domainScope.domain_id,
                resourceId
            ).pipe(Effect.catch(() => Effect.succeed(undefined)))

            if (
                storedUrl === null ||
                storedUrl === undefined ||
                storedUrl === ""
            ) {
                return unavailableResponse()
            }

            const resolvedUrl = yield* Effect.tryPromise({
                try: () => resolveImageUrl(storedUrl),
                catch: toOperationError,
            }).pipe(Effect.catch(() => Effect.succeed(null)))

            return resolvedUrl === null
                ? unavailableResponse()
                : Response.redirect(resolvedUrl, 302)
        })

export const makePublicDomainImageRoute = <Requirements, Failure>(
    resourceIdParameter: string,
    findPublicDomainImage: PublicDomainImageLookup<Requirements, Failure>
) =>
    makeTrustedPublicDomainImageRoute(
        resourceIdParameter,
        resolveDomainSessionScope,
        findPublicDomainImage
    )

export const handleUploadRoute = makeUploadRoute(authenticatedAccountId)

export const handleImageUrlRoute = makeImageUrlRoute(
    authenticatedAccountId,
    handle_upload_request
)
