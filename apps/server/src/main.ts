/**
 * # Server Entrypoint
 *
 * Thin application layer wiring together:
 * - RPC handlers from `@urm/rpc`
 * - Database layer from `@urm/database`
 * - Migrations at startup
 *
 * Runs as a stateful Node.js process behind a public API origin.
 */

// ESM evaluates static imports before this call. Imported modules must read
// environment values lazily; production values come from the host environment.
import { config as dotenvConfig } from "dotenv"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, "../../..")
const envPath = join(rootDir, ".env.local")

dotenvConfig({ path: envPath })

import { createServer } from "node:http"
import { Effect, Fiber, Layer, ManagedRuntime, Schedule } from "effect"
import { DatabaseLive, loadEnvironmentConfig } from "@urm/database"
import {
    findPublicGalleryImageUrl,
    findPublicProductImageUrl,
    findPublishedEventImageUrl,
} from "@urm/rpc"
import { AuthPersistenceLive } from "@urm/auth/auth-persistence"
import { AuditEventPersistenceLive } from "@urm/auth/audit-events"
import { ObservabilityLogPersistenceLive } from "@urm/auth/observability-logs"
import {
    ObservabilitySpanPersistenceLive,
    ObservabilityTracerLive,
} from "@urm/auth/observability-spans"
import { AuthSessionPersistenceLive } from "@urm/auth/auth-session-persistence"
import { PasswordCredentialPersistenceLive } from "@urm/auth/password-credential-persistence"
import { AuthConfigLive, ServerConfig, ServerConfigLive } from "@urm/env/server"
import {
    DeliveryPersistenceLive,
    EmailSqlLive,
    dispatchPendingNewsletterSends,
    pollCloudflareEmailEvents,
    recoverStaleEmailDeliveries,
} from "@urm/email/postgres"
import {
    handleContactFormRequest,
    handleMailRequest,
    PasswordResetConfirmationLive,
} from "@urm/http"
import { isContactFormRoute, isMailRoute } from "./http/auth.ts"
import { handle_social_webhook_request } from "./http/social-webhook.ts"
import { requestContextFromIncomingMessage } from "./http/context.ts"
import {
    devOrigin,
    getConfiguredAllowedOrigins,
    getHttpServerTimeouts,
    getMaxRequestBodyBytes,
    handleCors,
    requestContentLengthExceedsLimit,
    requestFromIncomingMessage,
    sendResponse,
} from "./http/request.ts"
import {
    handleImageUrlRoute,
    makePublicDomainImageRoute,
    handleUploadRoute,
} from "./http/uploads.ts"
import { ObservabilityLoggerWired } from "./rpc/layer.ts"
import { runtimeCapabilities } from "./demo-runtime.ts"
import { RuntimeEmailTransportLive } from "./runtime-email-transport.ts"
import {
    shouldRejectAuthMutationRequest,
    shouldRejectRpcRequest,
} from "./rpc/csrf.ts"
import { rpcHandler, rpc_runtime } from "./rpc/router.ts"
import { development_worker_live } from "@urm/rpc/handlers/publishing"
import {
    reconcile_social_posts,
    reconcile_social_provider_events,
    SocialStoreLive,
    ZernioProviderLive,
} from "@urm/rpc/handlers/social"
import { startup } from "./startup.ts"
import { SqlLive } from "@urm/database/sql"
import {
    handle_upload_request,
    UploadStorageLive,
} from "@urm/http/uploads-web-handler"
import { handle_auth_request } from "@urm/http/auth-web-handler"
import { handle_health_request } from "@urm/http/health-web-handler"

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 1234
const BIND_HOST = process.env.HOST ?? "0.0.0.0"
const runtime_environment = await Effect.runPromise(loadEnvironmentConfig)
const runtime_capabilities = runtimeCapabilities(runtime_environment.is_demo)

const normalizeApiEndpointPath = (pathname: string): string => {
    if (pathname === "/api/rpc/") {
        return "/api/rpc"
    }

    if (pathname === "/upload/") {
        return "/upload"
    }

    if (pathname === "/image-url/") {
        return "/image-url"
    }

    if (pathname === "/event-image/") {
        return "/event-image"
    }

    if (pathname === "/gallery-image/") {
        return "/gallery-image"
    }

    if (pathname === "/product-image/") {
        return "/product-image"
    }

    return pathname
}

const account_runtime = ManagedRuntime.make(
    Layer.mergeAll(
        SqlLive.pipe(Layer.provide(DatabaseLive)),
        UploadStorageLive
    ).pipe(Layer.orDie)
)

const runtime = rpc_runtime
const handlePublicEventImageRoute = makePublicDomainImageRoute(
    "event_id",
    findPublishedEventImageUrl
)
const handlePublicGalleryImageRoute = makePublicDomainImageRoute(
    "image_id",
    findPublicGalleryImageUrl
)
const handlePublicProductImageRoute = makePublicDomainImageRoute(
    "product_id",
    findPublicProductImageUrl
)
const authRuntime = ManagedRuntime.make(
    Layer.orDie(
        Layer.mergeAll(
            DatabaseLive,
            AuthPersistenceLive.pipe(Layer.provide(DatabaseLive)),
            AuditEventPersistenceLive.pipe(Layer.provide(DatabaseLive)),
            ObservabilityLogPersistenceLive.pipe(Layer.provide(DatabaseLive)),
            ObservabilityTracerLive.pipe(
                Layer.provide(
                    ObservabilitySpanPersistenceLive.pipe(
                        Layer.provide(DatabaseLive)
                    )
                )
            ),
            AuthSessionPersistenceLive.pipe(Layer.provide(DatabaseLive)),
            PasswordCredentialPersistenceLive.pipe(Layer.provide(DatabaseLive)),
            AuthConfigLive,
            ServerConfigLive,
            RuntimeEmailTransportLive,
            DeliveryPersistenceLive,
            EmailSqlLive.pipe(Layer.provide(DatabaseLive)),
            PasswordResetConfirmationLive,
            ObservabilityLoggerWired
        )
    )
)

const handleRequest = async (
    req: import("node:http").IncomingMessage,
    res: import("node:http").ServerResponse
) => {
    const requestContext = requestContextFromIncomingMessage(req)
    const url = new URL(req.url || "/", `http://${req.headers.host}`)
    res.setHeader("x-request-id", requestContext.request_id)
    console.log(
        `[server] ${req.method} ${url.pathname} request_id=${requestContext.request_id}`
    )

    const allowedOrigins = getConfiguredAllowedOrigins(
        runtime_environment.is_demo
    )

    if (!handleCors(req, res, allowedOrigins)) {
        return
    }

    if (
        requestContentLengthExceedsLimit(
            req.headers["content-length"],
            getMaxRequestBodyBytes()
        )
    ) {
        await sendResponse(
            res,
            Response.json({ error: "Payload too large" }, { status: 413 }),
            requestContext
        )
        req.resume()
        return
    }

    if ((req.url === "/" || req.url === "") && req.method === "GET") {
        await sendResponse(
            res,
            Response.json({ status: "ok", service: "rpc" }),
            requestContext
        )
        return
    }

    url.pathname = normalizeApiEndpointPath(url.pathname)

    const request = await requestFromIncomingMessage(
        req,
        url,
        requestContext,
        getMaxRequestBodyBytes()
    )

    if (request === undefined) {
        await sendResponse(
            res,
            Response.json({ error: "Payload too large" }, { status: 413 }),
            requestContext
        )
        return
    }

    if (shouldRejectAuthMutationRequest(request)) {
        // Otherwise indistinguishable from the 404 the auth handlers return.
        console.log(
            `[server] rejected ${url.pathname}: missing RPC CSRF header`
        )
        res.writeHead(403)
        res.end("Forbidden")
        return
    }

    if (
        url.pathname === "/api/uploads" ||
        url.pathname.startsWith("/api/uploads/")
    ) {
        await sendResponse(
            res,
            runtime_capabilities.uploads_enabled
                ? await account_runtime.runPromise(
                      handle_upload_request(request)
                  )
                : new Response(null, { status: 404 }),
            requestContext
        )
        return
    }

    if (request.method === "GET" && url.pathname === "/upload") {
        if (!runtime_capabilities.uploads_enabled) {
            await sendResponse(
                res,
                new Response(null, {
                    status: 404,
                    headers: { "Cache-Control": "no-store" },
                }),
                requestContext
            )
            return
        }

        await sendResponse(
            res,
            await account_runtime.runPromise(handleUploadRoute(request)),
            requestContext
        )
        return
    }

    if (request.method === "GET" && url.pathname === "/image-url") {
        if (!runtime_capabilities.storage_proxy_enabled) {
            await sendResponse(
                res,
                new Response(null, {
                    status: 404,
                    headers: { "Cache-Control": "no-store" },
                }),
                requestContext
            )
            return
        }

        await sendResponse(
            res,
            await account_runtime.runPromise(handleImageUrlRoute(request)),
            requestContext
        )
        return
    }

    if (request.method === "GET" && url.pathname === "/event-image") {
        if (!runtime_capabilities.storage_proxy_enabled) {
            await sendResponse(
                res,
                new Response(null, {
                    status: 404,
                    headers: { "Cache-Control": "no-store" },
                }),
                requestContext
            )
            return
        }

        await sendResponse(
            res,
            await authRuntime.runPromise(handlePublicEventImageRoute(request)),
            requestContext
        )
        return
    }

    if (request.method === "GET" && url.pathname === "/gallery-image") {
        if (!runtime_capabilities.storage_proxy_enabled) {
            await sendResponse(
                res,
                new Response(null, {
                    status: 404,
                    headers: { "Cache-Control": "no-store" },
                }),
                requestContext
            )
            return
        }

        await sendResponse(
            res,
            await authRuntime.runPromise(
                handlePublicGalleryImageRoute(request)
            ),
            requestContext
        )
        return
    }

    if (request.method === "GET" && url.pathname === "/product-image") {
        if (!runtime_capabilities.storage_proxy_enabled) {
            await sendResponse(
                res,
                new Response(null, {
                    status: 404,
                    headers: { "Cache-Control": "no-store" },
                }),
                requestContext
            )
            return
        }

        await sendResponse(
            res,
            await authRuntime.runPromise(
                handlePublicProductImageRoute(request)
            ),
            requestContext
        )
        return
    }

    if (request.method === "GET" && url.pathname === "/health") {
        await sendResponse(
            res,
            await account_runtime.runPromise(handle_health_request),
            requestContext
        )
        return
    }

    if (url.pathname.startsWith("/auth/")) {
        await sendResponse(
            res,
            await account_runtime.runPromise(handle_auth_request(request)),
            requestContext
        )
        return
    }

    if (url.pathname === "/webhooks/zernio") {
        await sendResponse(
            res,
            await account_runtime.runPromise(
                handle_social_webhook_request(request)
            ),
            requestContext
        )
        return
    }

    if (isMailRoute(url.pathname)) {
        const response = await authRuntime.runPromise(
            handleMailRequest(request)
        )
        await sendResponse(res, response, requestContext)
        return
    }

    if (isContactFormRoute(url.pathname)) {
        const response = await authRuntime.runPromise(
            handleContactFormRequest(request)
        )
        await sendResponse(res, response, requestContext)
        return
    }

    if (shouldRejectRpcRequest(request)) {
        res.writeHead(403)
        res.end("Forbidden")
        return
    }

    const response = await rpcHandler(request)
    await sendResponse(res, response, requestContext)
}

const server = createServer((req, res) => {
    void handleRequest(req, res).catch(() => {
        console.error("[server] Request failed")
        if (res.headersSent) {
            res.destroy()
            return
        }
        res.writeHead(500)
        res.end("Internal Server Error")
    })
})
const http_server_timeouts = getHttpServerTimeouts()

server.requestTimeout = http_server_timeouts.request_timeout_ms
server.headersTimeout = http_server_timeouts.headers_timeout_ms
server.keepAliveTimeout = http_server_timeouts.keep_alive_timeout_ms

// Run startup (migrations) before accepting requests
await runtime.runPromise(startup)

server.listen(PORT, BIND_HOST, () => {
    const deployment_worker = account_runtime.runFork(development_worker_live)
    const newsletter_delivery_worker = runtime.runFork(
        Effect.gen(function* () {
            const config = yield* ServerConfig
            const count = yield* dispatchPendingNewsletterSends(config.appUrl)
            if (count > 0)
                yield* Effect.log(`Newsletter delivery checked ${count} sends`)
        }).pipe(
            Effect.tapError((error) =>
                Effect.logError("Newsletter delivery worker failed", error)
            ),
            Effect.ignore,
            Effect.repeat(Schedule.spaced("1 minute"))
        )
    )
    const email_recovery_worker = runtime.runFork(
        recoverStaleEmailDeliveries().pipe(
            Effect.tap(({ deliveries, sends }) =>
                Effect.log(
                    `Email recovery checked: ${deliveries} uncertain deliveries, ${sends} reconciled sends`
                )
            ),
            Effect.tapError((error) =>
                Effect.logError("Email recovery failed", error)
            ),
            Effect.ignore,
            Effect.repeat(Schedule.spaced("1 hour"))
        )
    )
    const email_events_worker = runtime.runFork(
        pollCloudflareEmailEvents().pipe(
            Effect.tap((count) =>
                count > 0
                    ? Effect.log(`Cloudflare email events processed: ${count}`)
                    : Effect.void
            ),
            Effect.tapError((error) =>
                Effect.logError("Cloudflare email events worker failed", error)
            ),
            Effect.ignore,
            Effect.repeat(Schedule.spaced("1 minute"))
        )
    )
    const social_reconciliation_worker = runtime.runFork(
        Effect.all([
            reconcile_social_provider_events(),
            reconcile_social_posts(),
        ]).pipe(
            Effect.provide(Layer.mergeAll(SocialStoreLive, ZernioProviderLive)),
            Effect.tapError((error) =>
                Effect.logError("Social reconciliation worker failed", error)
            ),
            Effect.ignore,
            Effect.repeat(Schedule.spaced("1 minute"))
        )
    )
    server.once("close", () => {
        void account_runtime.runPromise(Fiber.interrupt(deployment_worker))
        void runtime.runPromise(Fiber.interrupt(newsletter_delivery_worker))
        void runtime.runPromise(Fiber.interrupt(email_recovery_worker))
        void runtime.runPromise(Fiber.interrupt(email_events_worker))
        void runtime.runPromise(Fiber.interrupt(social_reconciliation_worker))
    })
    const advertised_origin =
        process.env.NODE_ENV === "production"
            ? `http://${BIND_HOST}`
            : devOrigin()
    console.log(
        `[server] Running on ${advertised_origin}:${PORT} (bound ${BIND_HOST}:${PORT})`
    )
    console.log("[server] CORS policy configured")
})
