import { Effect } from "effect"
import { EmailSql } from "@urm/email/postgres"
import { consumeUnsubscribeToken } from "@urm/email/postgres"

const UNSUBSCRIBE_CONFIRMATION_HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribed</title><style>body{font-family:Arial,sans-serif;line-height:1.5;color:#111827;background:#ffffff;margin:0;padding:24px}main{max-width:560px;margin:0 auto;padding:24px}h1{font-size:24px;margin:0 0 12px}p{margin:0 0 12px;color:#374151}</style></head><body><main><h1>You are unsubscribed</h1><p>You will no longer receive newsletters to this email address.</p><p>If this was a mistake, you can resubscribe from your account preferences.</p></main></body></html>`

const UNSUBSCRIBE_INVALID_HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe</title><style>body{font-family:Arial,sans-serif;line-height:1.5;color:#111827;background:#ffffff;margin:0;padding:24px}main{max-width:560px;margin:0 auto;padding:24px}h1{font-size:24px;margin:0 0 12px}p{margin:0 0 12px;color:#374151}</style></head><body><main><h1>Unsubscribe link invalid</h1><p>This unsubscribe link is invalid, already used, or expired.</p></main></body></html>`

const htmlResponse = (body: string, status: number): Response =>
    new Response(body, {
        status,
        headers: { "Content-Type": "text/html; charset=utf-8" },
    })

// Missing, malformed, consumed, expired, and database-error all render the same
// 400 page. Distinguishing them makes the endpoint an oracle for whether a given
// token — and so a given subscription — exists.
export const handleMailRequest = (
    request: Request
): Effect.Effect<Response, never, EmailSql> =>
    Effect.gen(function* () {
        const url = new URL(request.url)

        if (url.pathname !== "/mail/unsubscribe") {
            return new Response("Not found", { status: 404 })
        }

        const token = url.searchParams.get("token")

        if (token === null || token.length === 0) {
            return htmlResponse(UNSUBSCRIBE_INVALID_HTML, 400)
        }

        const consumed = yield* consumeUnsubscribeToken(token)

        if (consumed === undefined) {
            return htmlResponse(UNSUBSCRIBE_INVALID_HTML, 400)
        }

        yield* Effect.logInfo("email.unsubscribe.completed", {
            contact_id: consumed.contact_id,
            list_key: consumed.list_key,
        })

        return htmlResponse(UNSUBSCRIBE_CONFIRMATION_HTML, 200)
    }).pipe(
        Effect.catch(() =>
            Effect.succeed(htmlResponse(UNSUBSCRIBE_INVALID_HTML, 400))
        )
    )
