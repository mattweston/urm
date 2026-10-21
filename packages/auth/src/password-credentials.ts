/**
 * # Password Credentials
 *
 * scrypt hashing and the `auth_password_credentials` row lifecycle.
 */
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"
import { and, eq, isNull } from "drizzle-orm"
import { Duration, Effect, Metric, Schema } from "effect"
import { DB, schema } from "@urm/db"
import { PasswordCredentialPersistence } from "./password-credential-persistence.ts"

export const PASSWORD_HASH_ALGORITHM = "scrypt"

export type ScryptParameters = Readonly<{
    key_length: number
    salt: string
}>

export type PasswordHash = Readonly<{
    algorithm: typeof PASSWORD_HASH_ALGORITHM
    password_hash: string
    parameters: ScryptParameters
}>

const SCRYPT_KEY_LENGTH = 64
const SCRYPT_SALT_BYTES = 16

export class PasswordHashError extends Schema.TaggedError<PasswordHashError>()(
    "PasswordHashError",
    { cause: Schema.Defect() }
) {}

const passwordHashDuration = Metric.timer("auth_password_hash_duration_ms")
const passwordVerifyDuration = Metric.timer("auth_password_verify_duration_ms")
const authPasswordCredentialChangedTotal = Metric.counter(
    "auth_password_credential_changed_total"
).pipe(Metric.withConstantInput(1))

// scrypt is called without options, so the cost factors are Node's defaults
// (N=16384, r=8, p=1) and are never recorded in ScryptParameters. Every stored
// hash therefore depends on those defaults staying fixed — changing them, or
// passing explicit options here, invalidates every existing credential at once
// and looks exactly like every user typing the wrong password. Record cost in
// the parameters blob first if this ever needs to change.
const hashWithSalt = (password: string, salt: string) =>
    Effect.tryPromise({
        try: () =>
            new Promise<string>((resolve, reject) => {
                scrypt(
                    password,
                    salt,
                    SCRYPT_KEY_LENGTH,
                    (error, derivedKey) => {
                        if (error !== null) {
                            reject(error)
                            return
                        }

                        resolve(derivedKey.toString("hex"))
                    }
                )
            }),
        catch: (cause) => new PasswordHashError({ cause }),
    })

export const hashPassword = (
    password: string
): Effect.Effect<PasswordHash, PasswordHashError> =>
    Effect.gen(function* () {
        const start = Date.now()
        const salt = randomBytes(SCRYPT_SALT_BYTES).toString("base64url")
        const password_hash = yield* hashWithSalt(password, salt)
        yield* Metric.update(
            passwordHashDuration,
            Duration.millis(Date.now() - start)
        )

        const result: PasswordHash = {
            algorithm: PASSWORD_HASH_ALGORITHM,
            password_hash,
            parameters: {
                key_length: SCRYPT_KEY_LENGTH,
                salt,
            },
        }
        return result
    }).pipe(
        Effect.withSpan("auth.password.hash"),
        Effect.withLogSpan("auth.password.hash")
    )

const readScryptParameters = (value: unknown): ScryptParameters | undefined => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return undefined
    }

    if (!("key_length" in value) || !("salt" in value)) {
        return undefined
    }

    const keyLength = value.key_length
    const salt = value.salt

    if (typeof keyLength !== "number" || typeof salt !== "string") {
        return undefined
    }

    return {
        key_length: keyLength,
        salt,
    }
}

export const verifyPasswordHash = (
    password: string,
    credential: PasswordHash
): Effect.Effect<boolean, PasswordHashError> =>
    Effect.gen(function* () {
        const start = Date.now()
        const password_hash = yield* hashWithSalt(
            password,
            credential.parameters.salt
        )
        const actual = Buffer.from(password_hash, "hex")
        const expected = Buffer.from(credential.password_hash, "hex")

        if (actual.length !== expected.length) {
            yield* Metric.update(
                passwordVerifyDuration,
                Duration.millis(Date.now() - start)
            )
            return false
        }

        const result = timingSafeEqual(actual, expected)
        yield* Metric.update(
            passwordVerifyDuration,
            Duration.millis(Date.now() - start)
        )
        return result
    }).pipe(
        Effect.withSpan("auth.password.verify"),
        Effect.withLogSpan("auth.password.verify")
    )

// Inserts unconditionally. A contact that already has an active credential
// violates the partial unique index — use ensurePasswordCredential when one may
// exist, or replacePasswordCredential to change it.
export const createPasswordCredential = (
    contact_id: string,
    password: string
) =>
    Effect.gen(function* () {
        yield* Effect.annotateLogs({ contact_id })(Effect.void)
        yield* Effect.annotateSpans({ contact_id })(Effect.void)
        const db = yield* DB
        const now = Date.now()
        const credential = yield* hashPassword(password)

        yield* db.insert(schema.auth_password_credentials).values({
            contact_id,
            password_hash: credential.password_hash,
            algorithm: credential.algorithm,
            parameters: credential.parameters,
            created_at: now,
            updated_at: now,
        })
    }).pipe(
        Effect.withSpan("auth.password_credential.create"),
        Effect.withLogSpan("auth.password_credential.create")
    )

export const ensurePasswordCredential = (
    contact_id: string,
    password: string
) =>
    Effect.gen(function* () {
        const existing = yield* findActivePasswordCredential(contact_id)

        if (existing !== undefined) {
            return { created: false }
        }

        yield* createPasswordCredential(contact_id, password)
        return { created: true }
    })

export const replacePasswordCredential = (
    contact_id: string,
    password: string
) =>
    Effect.gen(function* () {
        yield* Effect.annotateLogs({ contact_id })(Effect.void)
        yield* Effect.annotateSpans({ contact_id })(Effect.void)
        const now = Date.now()
        const credential = yield* hashPassword(password)
        const persistence = yield* PasswordCredentialPersistence

        yield* persistence.replace({
            contact_id,
            password_hash: credential.password_hash,
            algorithm: credential.algorithm,
            parameters: credential.parameters,
            now,
        })
        yield* Effect.track(Effect.void, authPasswordCredentialChangedTotal)
    }).pipe(
        Effect.withSpan("auth.password_credential.replace"),
        Effect.withLogSpan("auth.password_credential.replace")
    )

export const findActivePasswordCredential = (contact_id: string) =>
    Effect.gen(function* () {
        const db = yield* DB
        const credentials = yield* db
            .select()
            .from(schema.auth_password_credentials)
            .where(
                and(
                    eq(schema.auth_password_credentials.contact_id, contact_id),
                    isNull(schema.auth_password_credentials.disabled_at)
                )
            )
            .limit(1)

        return credentials[0]
    })

export const verifyPasswordCredential = (
    contact_id: string,
    password: string
) =>
    Effect.gen(function* () {
        yield* Effect.annotateLogs({ contact_id })(Effect.void)
        yield* Effect.annotateSpans({ contact_id })(Effect.void)
        const credential = yield* findActivePasswordCredential(contact_id)

        // Fails closed: a missing credential, a foreign algorithm, and an
        // unparseable parameters blob all return false, so a corrupted row is
        // indistinguishable from a wrong password at the call site.
        if (
            credential === undefined ||
            credential.algorithm !== PASSWORD_HASH_ALGORITHM
        ) {
            return false
        }

        const parameters = readScryptParameters(credential.parameters)

        if (parameters === undefined) {
            return false
        }

        return yield* verifyPasswordHash(password, {
            algorithm: PASSWORD_HASH_ALGORITHM,
            password_hash: credential.password_hash,
            parameters,
        })
    })
