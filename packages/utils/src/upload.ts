/**
 * # Upload Utils
 *
 * Server-side presigning for object storage: PUT URLs for client uploads, GET
 * URLs for reads. Needs BUCKET_NAME, AWS_ENDPOINT_URL_S3, and AWS credentials.
 */
import { Schema } from "effect"
import { S3Client } from "@aws-sdk/client-s3"
import {
    PutObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    PutBucketCorsCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const createS3Client = (): S3Client => {
    const endpoint = process.env.AWS_ENDPOINT_URL_S3

    return new S3Client({
        region: process.env.AWS_REGION || "auto",
        ...(endpoint === undefined ? {} : { endpoint }),
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
        },
        forcePathStyle: true,
        tls: true,
        maxAttempts: 3,
        customUserAgent: "Tigris-S3-Client",
        requestHandler: {
            connectionTimeout: 5000,
            keepAlive: true,
            maxAttempts: 3,
            retryMode: "standard",
            socketTimeout: 5000,
        },
        disableHostPrefix: true,
        useArnRegion: false,
    })
}

const corsConfig = {
    CORSRules: [
        {
            AllowedHeaders: ["*"],
            AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
            AllowedOrigins: ["*"],
            ExposeHeaders: ["ETag", "Content-Type", "Content-Length"],
            MaxAgeSeconds: 3000,
        },
    ],
}

// AllowedOrigins is "*". Safe only because every object is private and reads go
// through a presigned GET — CORS is not the access control here.
export async function ensureUploadBucketCors(): Promise<void> {
    const endpointUrl = process.env.AWS_ENDPOINT_URL_S3
    const bucketName = process.env.BUCKET_NAME

    if (!endpointUrl) {
        throw new Error("AWS_ENDPOINT_URL_S3 environment variable is not set")
    }

    if (!bucketName) {
        throw new Error("BUCKET_NAME environment variable is not set")
    }

    const s3Client = createS3Client()

    await s3Client.send(
        new PutBucketCorsCommand({
            Bucket: bucketName,
            CORSConfiguration: corsConfig,
        })
    )
}

// `publicUrl` is stable but not fetchable — the bucket is private, so it is an
// identifier to store, and every read has to go back through resolveImageUrl for
// a fresh signature. Putting it straight into an <img src> returns AccessDenied.
export async function getUploadUrl(
    contentType: string = "image/jpeg"
): Promise<{
    url: string
    key: string
    publicUrl: string
}> {
    try {
        const endpointUrl = process.env.AWS_ENDPOINT_URL_S3
        const bucketName = process.env.BUCKET_NAME

        if (!endpointUrl) {
            throw new Error(
                "AWS_ENDPOINT_URL_S3 environment variable is not set"
            )
        }

        if (!bucketName) {
            throw new Error("BUCKET_NAME environment variable is not set")
        }

        // Create S3 client
        const s3Client = createS3Client()

        const key = `gallery/${crypto.randomUUID()}`

        // Create a command for upload
        const uploadCommand = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            ContentType: contentType,
            CacheControl: "private, max-age=31536000",
            Metadata: {
                "Content-Type": contentType,
                "Cache-Control": "private, max-age=31536000",
            },
        })

        // Upload: presigned PUT (expires 1h). Reads remain private and are
        // resolved through the authenticated image URL endpoint when needed.
        const uploadUrl = await getSignedUrl(s3Client, uploadCommand, {
            expiresIn: 3600,
            unhoistableHeaders: new Set(["host"]),
        })

        const base = endpointUrl.replace(/\/$/, "")
        const publicUrl = `${base}/${bucketName}/${key}`

        return {
            url: uploadUrl,
            key,
            publicUrl,
        }
    } catch (error) {
        throw new Error(
            `Failed to get upload URL: ${error instanceof Error ? error.message : "Unknown error"}`,
            { cause: error }
        )
    }
}

// Path is /bucket/key, so the first segment is dropped and the rest rejoined.
function getKeyFromStoredUrl(storedUrl: string): string | null {
    try {
        const u = new URL(storedUrl)
        const segs = u.pathname.split("/").filter(Boolean)
        if (segs.length < 2) return null
        return segs.slice(1).join("/")
    } catch {
        return null
    }
}

// Returns null on any failure, including missing env. Callers render a broken
// image rather than a 500 — but it also means a misconfigured bucket looks
// identical to a missing object.
async function getPresignedGetUrl(key: string): Promise<string | null> {
    const bucket = process.env.BUCKET_NAME
    if (!bucket) return null
    try {
        const s3 = createS3Client()
        const cmd = new GetObjectCommand({ Bucket: bucket, Key: key })
        return await getSignedUrl(s3, cmd, {
            expiresIn: 3600,
            unhoistableHeaders: new Set(["host"]),
        })
    } catch {
        return null
    }
}

// Signatures expire in an hour, so the result is per-request and must never be
// cached alongside the stored URL.
export async function resolveImageUrl(
    storedUrl: string
): Promise<string | null> {
    const key = getKeyFromStoredUrl(storedUrl)
    if (!key) return null
    const bucket = process.env.BUCKET_NAME
    if (!bucket) return null
    try {
        await createS3Client().send(
            new HeadObjectCommand({ Bucket: bucket, Key: key })
        )
    } catch {
        return null
    }
    return getPresignedGetUrl(key)
}

export class UploadConfigurationError extends Schema.TaggedErrorClass<UploadConfigurationError>()(
    "UploadConfigurationError",
    {}
) {}

/** Store an immutable private object at a server-generated workspace key. */
export async function putUploadObject(
    key: string,
    body: Uint8Array,
    content_type: string,
    signal?: AbortSignal
): Promise<void> {
    const bucket = process.env.BUCKET_NAME
    if (
        !bucket ||
        !process.env.AWS_ENDPOINT_URL_S3 ||
        !process.env.AWS_ACCESS_KEY_ID ||
        !process.env.AWS_SECRET_ACCESS_KEY
    ) {
        throw new UploadConfigurationError({})
    }
    await createS3Client().send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: body,
            ContentType: content_type,
            CacheControl: "private, no-store",
        }),
        signal === undefined ? {} : { abortSignal: signal }
    )
}

export const resolveUploadObject = getPresignedGetUrl

/** Read a private immutable upload directly from configured storage, never a caller URL. */
export async function readUploadObject(
    key: string,
    signal?: AbortSignal
): Promise<{ bytes: Uint8Array; content_type: string }> {
    const bucket = process.env.BUCKET_NAME
    if (!bucket) throw new UploadConfigurationError({})
    const object = await createS3Client().send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
        signal === undefined ? {} : { abortSignal: signal }
    )
    const limit = 1_048_576
    const reader = object.Body?.transformToWebStream().getReader()
    if (reader === undefined) throw new Error("Image is empty")
    const chunks: Uint8Array[] = []
    let size = 0
    try {
        if ((object.ContentLength ?? 0) > limit)
            throw new Error("Image is too large")
        for (;;) {
            const chunk = await reader.read()
            if (chunk.done) break
            size += chunk.value.length
            if (size > limit) throw new Error("Image is too large")
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
    return { bytes, content_type: object.ContentType ?? "" }
}

/**
 * Store an immutable, publicly readable copy of an already-uploaded image.
 *
 * Uploads are private by default and read back through the authenticated
 * `/api/uploads` route. Email is the exception: a newsletter is read outside
 * the application by recipients who hold no session, so the images it
 * references have to be fetchable without one. Publishing copies only the
 * images a send actually references, at send time, leaving the originals
 * private.
 */
export async function putPublicUploadObject(
    key: string,
    body: Uint8Array,
    content_type: string,
    signal?: AbortSignal
): Promise<string> {
    const bucket = process.env.BUCKET_NAME
    const endpoint = process.env.AWS_ENDPOINT_URL_S3
    if (
        !bucket ||
        !endpoint ||
        !process.env.AWS_ACCESS_KEY_ID ||
        !process.env.AWS_SECRET_ACCESS_KEY
    ) {
        throw new UploadConfigurationError({})
    }
    await createS3Client().send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: body,
            ContentType: content_type,
            ACL: "public-read",
            CacheControl: "public, max-age=31536000, immutable",
        }),
        signal === undefined ? {} : { abortSignal: signal }
    )
    return `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`
}
