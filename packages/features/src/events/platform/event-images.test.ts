import { expect, test } from "vitest"
import { init } from "./app.update.ts"
import { image_source } from "./event-images.ts"

test("private event images wait for a signed URL without calling the retired proxy", () => {
    const [model] = init("/events/new")
    const stored_url =
        "https://fly.storage.tigris.dev/urm-dev/domains/domain/gallery/image"
    const signed_url = `${stored_url}?X-Amz-Signature=test`
    expect(image_source(model, stored_url)).toBeUndefined()
    expect(
        image_source(
            { ...model, resolved_image_urls: { [stored_url]: signed_url } },
            stored_url
        )
    ).toBe(signed_url)
    expect(image_source(model, "https://example.com/image.jpg")).toBe(
        "https://example.com/image.jpg"
    )
    expect(image_source(model, "")).toBeUndefined()
})
