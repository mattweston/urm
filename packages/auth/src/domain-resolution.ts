import { Effect, Redacted } from "effect"
import { AuthConfig } from "@urm/env/server"
import {
    isTrustedDomainWorkerRequest,
    resolveDomainSessionScope,
} from "./domain-sessions.ts"

type DomainScope = {
    readonly domain_id: string
    readonly hostname: string
}

type DomainScopeResolver<Error, Requirements> = (
    hostname: string
) => Effect.Effect<DomainScope | undefined, Error, Requirements>

const unavailable = (): Response =>
    new Response(null, {
        status: 404,
        headers: { "Cache-Control": "no-store" },
    })

/** Resolve a public-site hostname only for a trusted domain worker. */
export const makeTrustedDomainScopeResolution =
    <Error, Requirements>(
        resolve_domain_scope: DomainScopeResolver<Error, Requirements>
    ) =>
    (request: Request) =>
        Effect.gen(function* () {
            const auth_config = yield* AuthConfig
            const original_hostname = request.headers.get("x-urm-original-host")

            if (
                request.method !== "GET" ||
                original_hostname === null ||
                !isTrustedDomainWorkerRequest(
                    request.headers,
                    Redacted.value(auth_config.domainWorkerToken)
                )
            ) {
                return unavailable()
            }

            const scope = yield* resolve_domain_scope(original_hostname)

            if (scope === undefined) {
                return unavailable()
            }

            return Response.json(
                { domain_id: scope.domain_id, hostname: scope.hostname },
                { headers: { "Cache-Control": "no-store" } }
            )
        }).pipe(Effect.catch(() => Effect.succeed(unavailable())))

export const handleTrustedDomainScopeResolution =
    makeTrustedDomainScopeResolution(resolveDomainSessionScope)
