/**
 * # Upload Media Util
 *
 * Near-duplicate of `../upload.ts`. This copy hardcodes `image/jpeg` and applies
 * the bucket CORS on every call; that one takes a contentType and exposes CORS
 * setup separately as `ensureUploadBucketCors`.
 */
import { S3Client } from "@aws-sdk/client-s3"
import {
    PutObjectCommand,
    GetObjectCommand,
    PutBucketCorsCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const createS3Client = (): S3Client => {
    return new S3Client({
        region: process.env.AWS_REGION || "auto",
        endpoint: process.env.AWS_ENDPOINT_URL_S3,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
        },
        forcePathStyle: true,
        tls: true,
        maxAttempts: 3,
        customUserAgent: "Tigris-S3-Client",
        requestHandler: {
            abortSignal: undefined,
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

// AllowedOrigins is "*". Safe only because every object is private and reads go
// through a presigned GET — CORS is not the access control here.
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

// Swallows every failure: a bucket whose CORS cannot be set still serves the
// presign, and the upload fails later in the browser instead of here.
async function ensureCORSConfig(
    s3Client: S3Client,
    bucketName: string
): Promise<void> {
    try {
        await s3Client.send(
            new PutBucketCorsCommand({
                Bucket: bucketName,
                CORSConfiguration: corsConfig,
            })
        )
    } catch {
        return
    }
}

// `publicUrl` is stable but not fetchable — the bucket is private, so it is an
// identifier to store, and every read has to go back through resolveImageUrl for
// a fresh signature. Putting it straight into an <img src> returns AccessDenied.
export async function getUploadUrl(): Promise<{
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

        // Initialize CORS configuration
        await ensureCORSConfig(s3Client, bucketName)

        const key = `gallery/${crypto.randomUUID()}`

        // Create a command for upload
        const uploadCommand = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            ContentType: "image/jpeg",
            CacheControl: "private, max-age=31536000",
            Metadata: {
                "Content-Type": "image/jpeg",
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
    return getPresignedGetUrl(key)
}
