import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { makeImageUrlRoute, makeUploadRoute } from "../src/http/uploads.ts"

const unauthenticatedContactId = () => Effect.succeed(undefined)
const handleUploadRoute = makeUploadRoute(unauthenticatedContactId)
const handleImageUrlRoute = makeImageUrlRoute(unauthenticatedContactId, () =>
    Effect.die("Private reader must not run")
)

describe("protected upload routes", () => {
    it.effect("rejects unowned legacy keys without consulting storage", () =>
        Effect.gen(function* () {
            const route = makeImageUrlRoute(
                () => Effect.succeed("account-one"),
                () =>
                    Effect.die("Unowned keys must not reach the private reader")
            )
            const response = yield* route(
                new Request(
                    "https://api.urm.dev/image-url?url=https://storage.test/bucket/gallery/private-image"
                )
            )
            assert.strictEqual(response.status, 404)
        })
    )

    it.effect(
        "preserves workspace authorization failures for stored upload URLs",
        () =>
            Effect.gen(function* () {
                let called = false
                const route = makeImageUrlRoute(
                    () => Effect.succeed("account-one"),
                    (request) =>
                        Effect.sync(() => {
                            called = true
                            assert.strictEqual(
                                new URL(request.url).pathname,
                                "/api/uploads/domain-two/media/11111111-2222-3333-4444-555555555555"
                            )
                            assert.strictEqual(
                                request.headers.get("cookie"),
                                "urm_account=dummy"
                            )
                            return new Response(null, { status: 403 })
                        })
                )
                const response = yield* route(
                    new Request(
                        "https://api.urm.dev/image-url?url=https://storage.test/bucket/domains/domain-two/media/images/11111111-2222-3333-4444-555555555555",
                        { headers: { cookie: "urm_account=dummy" } }
                    )
                )
                assert.strictEqual(called, true)
                assert.strictEqual(response.status, 403)
            })
    )

    it.effect("retires authenticated uploads without workspace ownership", () =>
        Effect.gen(function* () {
            const response = yield* makeUploadRoute(() =>
                Effect.succeed("account-one")
            )(new Request("https://api.urm.dev/upload"))
            assert.strictEqual(response.status, 410)
        })
    )
    it.effect("rejects unauthenticated upload URL requests", () =>
        Effect.gen(function* () {
            const response = yield* handleUploadRoute(
                new Request(
                    "https://api.urm.dev/upload?contentType=image%2Fpng"
                )
            )

            assert.strictEqual(response.status, 401)
            assert.deepStrictEqual(
                yield* Effect.promise(() => response.json()),
                {
                    error: "Authentication required",
                }
            )
        })
    )

    it.effect("rejects unauthenticated private-image URL requests", () =>
        Effect.gen(function* () {
            const response = yield* handleImageUrlRoute(
                new Request(
                    "https://api.urm.dev/image-url?url=https%3A%2F%2Fbucket.example%2Fgallery%2Fimage.png"
                )
            )

            assert.strictEqual(response.status, 401)
        })
    )

    it.effect(
        "rejects worker headers when no authenticated contact is resolved",
        () =>
            Effect.gen(function* () {
                const response = yield* handleUploadRoute(
                    new Request("https://api.urm.dev/upload", {
                        headers: {
                            "x-urm-domain-worker-token": "forged",
                            "x-urm-original-host": "urm.other-domain.urm.dev",
                        },
                    })
                )

                assert.strictEqual(response.status, 401)
            })
    )
})
