import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"
import { Effect, Schema } from "effect"

export const PasswordRecord = Schema.Struct({
    password_hash: Schema.String,
    salt: Schema.String,
    algorithm: Schema.Literal("scrypt"),
    cost: Schema.Literal(32768),
    block_size: Schema.Literal(8),
    parallelism: Schema.Literal(3),
    key_length: Schema.Literal(64),
})
export type PasswordRecord = typeof PasswordRecord.Type

export class PasswordError extends Schema.TaggedError<PasswordError>()(
    "PasswordError",
    {}
) {}

const derive = (password: string, salt: string) =>
    Effect.tryPromise({
        try: () =>
            new Promise<Buffer>((resolve, reject) => {
                scrypt(
                    password,
                    salt,
                    64,
                    { N: 32768, r: 8, p: 3, maxmem: 128 * 1024 * 1024 },
                    (error, key) => {
                        if (error !== null) reject(error)
                        else resolve(key)
                    }
                )
            }),
        catch: () => new PasswordError({}),
    })

export const hash_account_password = Effect.fn("Auth.hashPassword")(function* (
    password: string
) {
    const salt = randomBytes(16).toString("base64url")
    const key = yield* derive(password, salt)
    return PasswordRecord.make({
        password_hash: key.toString("hex"),
        salt,
        algorithm: "scrypt",
        cost: 32768,
        block_size: 8,
        parallelism: 3,
        key_length: 64,
    })
})

export const verify_account_password = Effect.fn("Auth.verifyPassword")(
    function* (password: string, record: PasswordRecord | undefined) {
        const key = yield* derive(
            password,
            record?.salt ?? "owned-auth-unknown-account"
        )
        const expected = Buffer.from(record?.password_hash ?? "", "hex")
        return expected.length === key.length && timingSafeEqual(expected, key)
    }
)
