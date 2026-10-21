import { Context, Effect } from "effect"
import { HttpServerRequest, HttpServerResponse } from "effect/http"
import { handleLoginUrl } from "@urm/auth/oauth/callback-handlers"
import {
    handleGoogleAuthorize,
    handleGoogleCallback,
} from "@urm/auth/oauth/google-handlers"

const jsonResponse = (body: unknown, init?: ResponseInit): Response =>
    new Response(JSON.stringify(body), {
        ...init,
        headers: new Headers({
            ...Object.fromEntries(new Headers(init?.headers).entries()),
            "Content-Type": "application/json; charset=utf-8",
        }),
    })

const internalServerErrorResponse = (): Response =>
    jsonResponse({ error: "Internal Server Error" }, { status: 500 })

const toWebResponse = <Error, R>(
    request: Request,
    handler: Effect.Effect<
        HttpServerResponse.HttpServerResponse,
        Error,
        R | HttpServerRequest.HttpServerRequest
    >
): Effect.Effect<Response, never, R> => {
    const requestContext = Context.make(
        HttpServerRequest.HttpServerRequest,
        HttpServerRequest.fromWeb(request)
    )

    return handler.pipe(
        Effect.provide(requestContext),
        Effect.flatMap((response) =>
            Effect.sync(() => HttpServerResponse.toWeb(response)).pipe(
                Effect.catchCause(() =>
                    Effect.logError(
                        "auth.google.response_conversion_failed"
                    ).pipe(Effect.as(internalServerErrorResponse()))
                )
            )
        ),
        Effect.catchCause(() =>
            Effect.logError("auth.google.handler_failed").pipe(
                Effect.as(internalServerErrorResponse())
            )
        )
    )
}

const toWebResponseWithSpan = <Error, R>(
    request: Request,
    handler: Effect.Effect<
        HttpServerResponse.HttpServerResponse,
        Error,
        R | HttpServerRequest.HttpServerRequest
    >,
    spanName: string
): Effect.Effect<Response, never, R> => {
    const requestId = request.headers.get("x-request-id") ?? undefined
    const annotations = { auth_route: spanName, request_id: requestId }

    return toWebResponse(request, handler).pipe(
        Effect.annotateLogs(annotations),
        Effect.annotateSpans(annotations),
        Effect.withSpan(spanName),
        Effect.withLogSpan(spanName)
    )
}

// These three paths sit under /auth/ but are not handled by
// handleFallbackAuthRequest, which 404s them. A runtime must try this handler
// first, or OAuth login breaks.
export const handleGoogleAuthRequest = (request: Request) => {
    const url = new URL(request.url)

    if (request.method === "GET" && url.pathname === "/auth/login-url") {
        return toWebResponseWithSpan(request, handleLoginUrl, "auth.login_url")
    }

    if (request.method === "GET" && url.pathname === "/auth/google/authorize") {
        return toWebResponseWithSpan(
            request,
            handleGoogleAuthorize,
            "auth.oauth.authorize"
        )
    }

    if (request.method === "GET" && url.pathname === "/auth/google/callback") {
        return toWebResponseWithSpan(
            request,
            handleGoogleCallback,
            "auth.oauth.callback"
        )
    }

    return Effect.succeed(jsonResponse({ error: "Not found" }, { status: 404 }))
}
