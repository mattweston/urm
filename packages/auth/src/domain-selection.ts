import { and, eq, inArray, isNull } from "drizzle-orm"
import { Effect, Schema } from "effect"
import { DB, schema } from "@urm/db"
import { ServerConfig } from "@urm/env/server"
import {
    createDomainSessionHandoff,
    generatedDomainAdminOrigin,
} from "./domain-sessions.ts"
import { generatedHostSuffix } from "./generated-hosts.ts"
import { getAuthSessionContactId } from "./sessions.ts"

const DomainSelectionInput = Schema.Struct({
    id: Schema.String,
})

class DomainSelectionRequestError extends Schema.TaggedError<DomainSelectionRequestError>()(
    "DomainSelectionRequestError",
    { cause: Schema.Defect() }
) {}

const unavailable = (): Response =>
    new Response(null, {
        status: 404,
        headers: { "Cache-Control": "no-store" },
    })

// Every rejection returns the same bare 404 so the client cannot probe which
// domains exist. The log is therefore the only place the reason survives.
const rejected = (reason: string, details: Record<string, string> = {}) =>
    Effect.logWarning("auth.domain_select.rejected", {
        reason,
        ...details,
    }).pipe(Effect.as(unavailable()))

/**
 * Authorize a central-session domain selection and issue a one-time handoff
 * for its configured generated admin hostname.
 */
export const handleCentralDomainSelection = (request: Request) =>
    Effect.gen(function* () {
        if (request.method !== "POST") {
            return yield* rejected("method_not_allowed", {
                method: request.method,
            })
        }

        const input = yield* Schema.decodeUnknownEffect(DomainSelectionInput)(
            yield* Effect.tryPromise({
                try: () => request.json(),
                catch: (cause) => new DomainSelectionRequestError({ cause }),
            })
        )
        const contact_id = yield* getAuthSessionContactId(request)

        if (contact_id === undefined) {
            return yield* rejected("no_central_session")
        }

        const db = yield* DB
        const rows = yield* db
            .select({ id: schema.domains.id, name: schema.domains.name })
            .from(schema.domains)
            .innerJoin(
                schema.domain_admin,
                eq(schema.domains.id, schema.domain_admin.domain_id)
            )
            .where(
                and(
                    eq(schema.domains.id, input.id),
                    eq(schema.domain_admin.contact_id, contact_id),
                    eq(schema.domain_admin.status, "active"),
                    isNull(schema.domains.deleted_at),
                    isNull(schema.domain_admin.deleted_at),
                    inArray(schema.domain_admin.role, ["owner", "admin"])
                )
            )
            .limit(1)
        const domain = rows[0]

        if (domain === undefined) {
            return yield* rejected("no_active_admin_role", {
                contact_id,
                domain_id: input.id,
            })
        }

        const server_config = yield* ServerConfig
        const origin = generatedDomainAdminOrigin(
            domain.name,
            server_config.adminAppUrl
        )

        if (origin === undefined) {
            // The admin app is not served from a host generated domains can hang
            // below, so there is nowhere to hand the session off to.
            return yield* rejected("admin_origin_unavailable", {
                domain_name: domain.name,
                central_hostname: new URL(server_config.adminAppUrl).hostname,
            })
        }

        const hostname = new URL(origin).hostname
        // generatedDomainAdminOrigin only returns a generated host, so the
        // suffix is always one of the known set.
        const suffix = generatedHostSuffix(hostname) ?? ".urm.dev"
        const handoff = yield* createDomainSessionHandoff(
            contact_id,
            {
                domain_id: domain.id,
                hostname,
                cookie_domain: `${domain.name}${suffix}`,
            },
            // Selecting a domain means going to administer it, and the tenant
            // host serves that at its own root. The `/urm/` path this replaced
            // is retired, as is the `urm.<domain>` host before it.
            "/"
        )

        if (handoff === undefined) {
            return yield* rejected("no_domain_relationship", {
                contact_id,
                domain_id: domain.id,
                hostname,
            })
        }

        return Response.json(
            {
                redirect_url: new URL(
                    `/auth/handoff/?code=${encodeURIComponent(handoff.code)}`,
                    origin
                ).toString(),
            },
            { headers: { "Cache-Control": "no-store" } }
        )
    }).pipe(
        Effect.catch((error) =>
            rejected("request_failed", { error: globalThis.String(error) })
        )
    )
