import { afterEach, expect, it, vi } from "vitest"
import { putUploadObject, UploadConfigurationError } from "../src/upload.ts"

afterEach(() => vi.unstubAllEnvs())
it("rejects missing server storage configuration before attempting an upload", async () => {
    for (const name of [
        "BUCKET_NAME",
        "AWS_ENDPOINT_URL_S3",
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY",
    ])
        vi.stubEnv(name, "")
    await expect(
        putUploadObject(
            "domains/test/images/test",
            new Uint8Array([1]),
            "image/png"
        )
    ).rejects.toBeInstanceOf(UploadConfigurationError)
})
