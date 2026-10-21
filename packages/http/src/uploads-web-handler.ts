import { randomUUID } from "node:crypto"
import { Context, Effect, Layer, Schema } from "effect"
import type { Sql } from "@urm/db/sql"
import {
    authenticate_token,
    session_token,
    require_account_domain,
} from "@urm/auth"
import { image_upload_limit, image_upload_types } from "@urm/contracts/uploads"
import {
    UploadConfigurationError,
    putUploadObject,
    resolveUploadObject,
} from "@urm/utils/upload"

export class UploadError extends Schema.TaggedError<UploadError>()(
    "UploadError",
    {
        status: Schema.Number,
        message: Schema.String,
    }
) {}
export class UploadStorage extends Context.Service<
    UploadStorage,
    {
        readonly put: (
            key: string,
            bytes: Uint8Array,
            content_type: string
        ) => Effect.Effect<void, UploadError>
        readonly url: (key: string) => Effect.Effect<string | null, UploadError>
    }
>()("@urm/http/UploadStorage") {}
const unavailable = (error?: unknown) =>
    new UploadError({
        status: 503,
        message:
            error instanceof UploadConfigurationError
                ? "Image uploads are not configured on this server."
                : error instanceof Error &&
                    [
                        "AccessDenied",
                        "InvalidAccessKeyId",
                        "SignatureDoesNotMatch",
                    ].includes(error.name)
                  ? "Image storage rejected the server credentials or permissions."
                  : error instanceof Error && error.name === "NoSuchBucket"
                    ? "The configured image storage bucket was not found."
                    : "Image storage is unavailable. Try again.",
    })
export const UploadStorageLive = Layer.succeed(
    UploadStorage,
    UploadStorage.of({
        put: (key, bytes, content_type) =>
            Effect.tryPromise({
                try: (signal) =>
                    putUploadObject(key, bytes, content_type, signal),
                catch: unavailable,
            }).pipe(
                Effect.tapError((error) => Effect.logWarning(error.message))
            ),
        url: (key) =>
            Effect.tryPromise({
                try: () => resolveUploadObject(key),
                catch: unavailable,
            }),
    })
)
const response = (error: string, status: number) =>
    Response.json(
        { error },
        {
            status,
            headers: { "Cache-Control": "no-store" },
        }
    )
const has_signature = (bytes: Uint8Array, type: string): boolean => {
    const starts = (values: number[], offset = 0) =>
        values.every((value, index) => bytes[index + offset] === value)
    switch (type) {
        case "image/png":
            return starts([137, 80, 78, 71, 13, 10, 26, 10])
        case "image/jpeg":
            return starts([255, 216, 255])
        case "image/gif":
            return (
                starts([71, 73, 70, 56]) &&
                (bytes[4] === 55 || bytes[4] === 57) &&
                bytes[5] === 97
            )
        case "image/webp":
            return starts([82, 73, 70, 70]) && starts([87, 69, 66, 80], 8)
        default:
            return false
    }
}
const read_image = (request: Request) =>
    Effect.tryPromise({
        try: async () => {
            const reader = request.body?.getReader()
            if (reader === undefined) return new Uint8Array()
            const chunks: Uint8Array[] = []
            let size = 0
            try {
                for (;;) {
                    const chunk = await reader.read()
                    if (chunk.done) break
                    size += chunk.value.length
                    if (size > image_upload_limit)
                        throw new UploadError({
                            status: 413,
                            message: "Choose an image smaller than 1 MB.",
                        })
                    chunks.push(chunk.value)
                }
            } finally {
                await reader.cancel()
                reader.releaseLock()
            }
            const bytes = new Uint8Array(size)
            let offset = 0
            for (const chunk of chunks) {
                bytes.set(chunk, offset)
                offset += chunk.length
            }
            return bytes
        },
        catch: (error) =>
            error instanceof UploadError
                ? error
                : new UploadError({
                      status: 400,
                      message: "Image could not be read.",
                  }),
    })

/** Account-authenticated image uploads and private reads; object keys are never caller-supplied. */
export const handle_upload_request = (
    request: Request
): Effect.Effect<Response, never, Sql | UploadStorage> =>
    Effect.gen(function* () {
        const url = new URL(request.url)
        const read_match =
            /^\/api\/uploads\/([^/]+)\/(media\/|documents\/|blog\/|pages\/|events\/|shop\/)?([0-9a-f-]{36})$/.exec(
                url.pathname
            )
        const upload =
            url.pathname === "/api/uploads" && request.method === "POST"
        if (!upload && !(read_match && request.method === "GET"))
            return response("Not found", 404)
        if (
            upload &&
            request.headers.get("x-requested-with") !== "XMLHttpRequest"
        )
            return response("Forbidden", 403)
        const principal = yield* authenticate_token(session_token(request))
        const domain_id = upload
            ? url.searchParams.get("domain_id")
            : yield* Effect.try({
                  try: () => decodeURIComponent(read_match?.[1] ?? ""),
                  catch: () =>
                      new UploadError({
                          status: 400,
                          message: "Invalid workspace.",
                      }),
              })
        if (!domain_id) return response("Workspace is required", 400)
        const module = upload
            ? (url.searchParams.get("module") ?? "Mail")
            : read_match?.[2] === "events/"
              ? "Events"
              : read_match?.[2] === "shop/"
                ? "Shop"
                : read_match?.[2] === "pages/"
                  ? "Pages"
                  : read_match?.[2] === "blog/"
                    ? "Blog"
                    : read_match?.[2] === "documents/"
                      ? "Documents"
                      : read_match?.[2] === "media/"
                        ? "Media"
                        : "Mail"
        if (
            module !== "Mail" &&
            module !== "Media" &&
            module !== "Documents" &&
            module !== "Blog" &&
            module !== "Pages" &&
            module !== "Events" &&
            module !== "Shop"
        )
            return response("Invalid upload module", 400)
        const prefix =
            module === "Events"
                ? "events/"
                : module === "Shop"
                  ? "shop/"
                  : module === "Pages"
                    ? "pages/"
                    : module === "Blog"
                      ? "blog/"
                      : module === "Media"
                        ? "media/"
                        : module === "Documents"
                          ? "documents/"
                          : ""
        yield* require_account_domain(
            principal,
            domain_id,
            upload,
            module === "Pages" ? null : module
        )
        const storage = yield* UploadStorage
        if (!upload) {
            const destination = yield* storage.url(
                `domains/${encodeURIComponent(domain_id)}/${prefix}images/${read_match?.[3]}`
            )
            return destination === null
                ? response("Image unavailable", 404)
                : new Response(null, {
                      status: 302,
                      headers: {
                          Location: destination,
                          "Cache-Control": "no-store",
                      },
                  })
        }
        const content_type = request.headers.get("content-type") ?? ""
        if (!image_upload_types.includes(content_type))
            return response("Choose a PNG, JPEG, WebP or GIF image.", 415)
        const bytes = yield* read_image(request)
        if (!has_signature(bytes, content_type))
            return response("The file does not match its image type.", 415)
        const id = randomUUID()
        yield* storage.put(
            `domains/${encodeURIComponent(domain_id)}/${prefix}images/${id}`,
            bytes,
            content_type
        )
        return Response.json(
            {
                url: `/api/uploads/${encodeURIComponent(domain_id)}/${prefix}${id}`,
            },
            {
                status: 201,
                headers: { "Cache-Control": "no-store" },
            }
        )
    }).pipe(
        Effect.catchTag("AuthError", (error) =>
            Effect.succeed(
                response(
                    "Image access denied",
                    error.reason === "forbidden" ? 403 : 401
                )
            )
        ),
        Effect.catchTag("UploadError", (error) =>
            Effect.succeed(response(error.message, error.status))
        ),
        Effect.catch(() =>
            Effect.succeed(response("Image service unavailable", 503))
        )
    )
