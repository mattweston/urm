/\*\*

- HTTP API router.
-
- Mounts all API routes: index, login, sync server mutate/query, upload and
- image URL resolution, health, checkout and success callback, and webhooks
- (payment and email delivery). Each route delegates to a handler in this
- package.
-
- :::note[Routes]
-   - `GET /` — API info and endpoint list
-   - `POST /mutate`, `POST /query` — Sync server endpoints
-   - `GET /upload`, `GET /image-url` — Upload and presigned image URL
-   - `GET /health` — Liveness
-   - `POST /api/checkout`, `GET /api/checkout/success` — Checkout flow
-   - `POST /webhooks/stripe`, `POST /webhooks/resend` — Incoming webhooks
- :::
-
- @packageDocumentation
  \*/
  import { HttpRouter, HttpServerRequest, HttpServerResponse } from "@effect/platform"
  import { Effect } from "effect"
  import { getUploadUrl, resolveImageUrl } from "@urm/utils/media/upload.js"
  import { handleCheckout } from "@urm/server/handlers/api/shop/checkout.js"
  import { handleCheckoutSuccess } from "@urm/server/handlers/api/shop/checkout-success.js"
  import { handleStripeWebhook } from "@urm/server/handlers/api/shop/webhook.js"
  import { handleResendWebhook } from "@urm/server/handlers/api/mail/resend.js"

// TODO : not 'api' path , and group by functionality/folders
/\*_ Effect Platform HTTP router with all API routes mounted. _/
export const apiRouter = HttpRouter.empty.pipe(
// GET /
HttpRouter.get(
"/",
HttpServerResponse.json({
message: "URM API",
endpoints: {
upload: "GET /upload",
"image-url": "GET /image-url?url=... (302 to presigned GET)",
checkout: "POST /api/checkout",
"checkout-success": "GET /api/checkout/success?session_id=...",
"webhook-stripe": "POST /webhooks/stripe",
"webhook-resend": "POST /webhooks/resend",
health: "GET /health",
},
})
),

    // GET /upload
    HttpRouter.get(
        "/upload",
        Effect.flatMap(
            Effect.tryPromise({
                try: () => getUploadUrl(),
                catch: (error) =>
                    new Error(error instanceof Error ? error.message : "Unknown error"),
            }),
            (result) => HttpServerResponse.json(result)
        )
    ),

    // GET /health
    HttpRouter.get(
        "/health",
        Effect.succeed(HttpServerResponse.text("OK"))
    ),

    // GET /image-url?url=... — 302 to fresh presigned GET (bucket private)
    HttpRouter.get(
        "/image-url",
        Effect.flatMap(HttpServerRequest.HttpServerRequest, (req) => {
            const u = new URL(req.url, "http://localhost");
            const stored = u.searchParams.get("url");
            if (!stored)
                return Effect.succeed(HttpServerResponse.text("Missing url", { status: 400 }));
            return Effect.flatMap(
                Effect.tryPromise({ try: () => resolveImageUrl(stored), catch: () => null }),
                (target) =>
                    target
                        ? Effect.succeed(HttpServerResponse.text("", { status: 302, headers: { Location: target } }))
                        : Effect.succeed(HttpServerResponse.text("Could not resolve", { status: 400 }))
            );
        })
    ),

    // POST /api/checkout - Create Stripe checkout session
    HttpRouter.post(
        "/api/checkout",
        Effect.flatMap(HttpServerRequest.HttpServerRequest, (request) => handleCheckout(request))
    ),

    // GET /api/checkout/success - Handle Stripe success callback
    HttpRouter.get(
        "/api/checkout/success",
        Effect.flatMap(HttpServerRequest.HttpServerRequest, (request) => handleCheckoutSuccess(request))
    ),

    // POST /webhooks/stripe - Stripe webhook for payment events
    HttpRouter.post(
        "/webhooks/stripe",
        Effect.flatMap(HttpServerRequest.HttpServerRequest, (request) => handleStripeWebhook(request))
    ),

    // POST /webhooks/resend - Resend webhook for email delivery status
    HttpRouter.post(
        "/webhooks/resend",
        Effect.flatMap(HttpServerRequest.HttpServerRequest, (request) => handleResendWebhook(request))
    ),

)
