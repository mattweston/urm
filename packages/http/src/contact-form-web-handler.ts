import { randomUUID } from "node:crypto"
import { and, eq, isNull } from "drizzle-orm"
import { Effect, Redacted, Schema } from "effect"
import {
    isTrustedDomainWorkerRequest,
    resolveDomainSessionScope,
} from "@urm/auth/legacy"
import { authRateLimitKey, checkAuthRateLimit } from "@urm/auth/rate-limiter"
import { DB, schema } from "@urm/db"
import { PublicContactSubmissionRequest } from "@urm/domain/schemas/public-contact"
import { AuthConfig } from "@urm/env/server"
import {
    RequestDecodeError,
    WebHandlerPersistenceError,
} from "./web-handler-errors.ts"

const acceptedResponse = (): Response =>
    Response.json(
        { accepted: true },
        { status: 202, headers: { "Cache-Control": "no-store" } }
    )

const invalidRequestResponse = (): Response =>
    Response.json(
        { error: "Invalid contact request" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
    )

const notFoundResponse = (): Response =>
    new Response(null, {
        status: 404,
        headers: { "Cache-Control": "no-store" },
    })

const decodeRequest = (request: Request) =>
    Effect.tryPromise({
        try: () => request.json(),
        catch: (cause) => new RequestDecodeError({ cause }),
    }).pipe(
        Effect.flatMap(
            Schema.decodeUnknownEffect(
                Schema.Struct({
                    name: Schema.String,
                    email: Schema.String,
                    message: Schema.String,
                })
            )
        ),
        Effect.map(({ name, email, message }) => ({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            message: message.trim(),
        })),
        Effect.flatMap(
            Schema.decodeUnknownEffect(PublicContactSubmissionRequest)
        )
    )

const resolveDomainId = (request: Request) =>
    Effect.gen(function* () {
        const auth_config = yield* AuthConfig
        const original_hostname = request.headers.get("x-urm-original-host")

        if (
            original_hostname === null ||
            !isTrustedDomainWorkerRequest(
                request.headers,
                Redacted.value(auth_config.domainWorkerToken)
            )
        ) {
            return undefined
        }

        const scope = yield* resolveDomainSessionScope(original_hostname)
        return scope?.domain_id
    })

const rateLimitSubmission = (request: Request, email: string) =>
    Effect.gen(function* () {
        const client_ip =
            request.headers.get("cf-connecting-ip") ??
            request.headers.get("x-forwarded-for") ??
            "unknown"
        const decision = yield* checkAuthRateLimit({
            route: "mail/contact/submit",
            key: authRateLimitKey([client_ip, email]),
            limit: 5,
            window_seconds: 60 * 60,
            block_seconds: 60 * 60,
        }).pipe(
            Effect.catch(() =>
                Effect.succeed({ allowed: true } satisfies Readonly<{
                    allowed: true
                }>)
            )
        )

        return decision.allowed
    })

const persistSubmission = (
    domain_id: string,
    input: Schema.Schema.Type<typeof PublicContactSubmissionRequest>
) =>
    Effect.gen(function* () {
        const db = yield* DB
        const contact_rows = yield* db
            .select()
            .from(schema.contacts)
            .where(
                and(
                    eq(schema.contacts.email, input.email),
                    isNull(schema.contacts.deleted_at)
                )
            )
            .limit(1)
        const contact =
            contact_rows[0] === undefined
                ? (yield* db
                      .insert(schema.contacts)
                      .values({
                          id: `contact-${randomUUID()}`,
                          name: input.name,
                          email: input.email,
                          created_at: Date.now(),
                          updated_at: Date.now(),
                      })
                      .returning())[0]
                : contact_rows[0]

        if (contact === undefined) {
            return yield* Effect.fail(
                new WebHandlerPersistenceError({
                    operation: "persistContactSubmission.contact",
                })
            )
        }

        const domain_contact_rows = yield* db
            .select({ id: schema.domain_contacts.id })
            .from(schema.domain_contacts)
            .where(
                and(
                    eq(schema.domain_contacts.domain_id, domain_id),
                    eq(schema.domain_contacts.contact_id, contact.id),
                    isNull(schema.domain_contacts.deleted_at)
                )
            )
            .limit(1)

        if (domain_contact_rows[0] === undefined) {
            yield* db.insert(schema.domain_contacts).values({
                domain_id,
                contact_id: contact.id,
                source: "contact_form",
                display_name: input.name,
            })
        }

        yield* db.insert(schema.contact_submissions).values({
            domain_id,
            contact_id: contact.id,
            message: input.message,
        })
    })

/** Public contact submission route for a trusted, resolved domain hostname. */
export const handleContactFormRequest = (request: Request) =>
    Effect.gen(function* () {
        if (
            request.method !== "POST" ||
            new URL(request.url).pathname.replace(/\/+$/, "") !==
                "/mail/contact/submit"
        ) {
            return notFoundResponse()
        }

        const domain_id = yield* resolveDomainId(request)

        if (domain_id === undefined) {
            return notFoundResponse()
        }

        const input = yield* decodeRequest(request).pipe(
            Effect.catch(() => Effect.succeed(undefined))
        )

        if (input === undefined) {
            return invalidRequestResponse()
        }

        const allowed = yield* rateLimitSubmission(request, input.email)

        if (!allowed) {
            return acceptedResponse()
        }

        yield* persistSubmission(domain_id, input).pipe(
            Effect.catch(() => Effect.void)
        )
        return acceptedResponse()
    }).pipe(Effect.catch(() => Effect.succeed(invalidRequestResponse())))
