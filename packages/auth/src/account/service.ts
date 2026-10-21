/** # Account authentication and authorization */
import { createHash, randomBytes, randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { Effect, Schema } from "effect"
import { Sql, query_rows } from "@urm/db/sql"
import { AccountProfile, AccountDomain } from "@urm/contracts/auth"
import {
    PasswordRecord,
    hash_account_password,
    verify_account_password,
} from "./password.ts"

export class AuthError extends Schema.TaggedErrorClass<AuthError>()(
    "AuthError",
    {
        reason: Schema.Literals([
            "invalid_credentials",
            "rate_limited",
            "unauthenticated",
            "forbidden",
            "invalid_input",
            "conflict",
        ]),
    }
) {}

export const AccountPrincipal = Schema.Struct({
    account_id: Schema.String,
    contact_id: Schema.NullOr(Schema.String),
    session_id: Schema.String,
})
export type AccountPrincipal = typeof AccountPrincipal.Type

const LoginInput = Schema.Struct({
    email: Schema.String.check(Schema.isMinLength(3), Schema.isMaxLength(255)),
    password: Schema.String.check(
        Schema.isMinLength(1),
        Schema.isMaxLength(1024)
    ),
})
const ProvisionInput = Schema.Struct({
    name: Schema.Trimmed.check(Schema.isMinLength(1), Schema.isMaxLength(255)),
    email: Schema.String.check(
        Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
        Schema.isMaxLength(255)
    ),
    password: Schema.String.check(
        Schema.isMinLength(15),
        Schema.isMaxLength(1024)
    ),
    slug: Schema.String.check(
        Schema.isPattern(/^[a-z0-9]+(-[a-z0-9]+)*$/),
        Schema.isMaxLength(100)
    ),
})
const Id = Schema.Struct({ id: Schema.String })
const Credential = Schema.Struct({
    account_id: Schema.String,
    ...PasswordRecord.fields,
})
const PersonalOrganization = Schema.Struct({
    personal_organization_id: Schema.NullOr(Schema.String),
    name: Schema.NullOr(Schema.String),
})
const token_hash = (token: string) =>
    createHash("sha256").update(token).digest("hex")
const idle_ms = 12 * 60 * 60 * 1000
const absolute_ms = 30 * 24 * 60 * 60 * 1000
const failure = (reason: AuthError["reason"]) => new AuthError({ reason })

/**
 * Operator-only account provisioning. A new account owns a personal organization
 * for root domains and a separate customer organization for its first domain.
 * Each organization starts with a one-domain limit. Matching an existing CRM
 * email is a conflict; this operation is never exposed as unauthenticated HTTP.
 */
export const provision_account = Effect.fn("Auth.provisionAccount")(function* (
    value: unknown
) {
    const input = yield* Schema.decodeUnknownEffect(ProvisionInput)(value).pipe(
        Effect.mapError(() => failure("invalid_input"))
    )
    const email = input.email.trim().toLowerCase()
    const password = yield* hash_account_password(input.password)
    const db = yield* Sql
    const account_id = randomUUID()
    const contact_id = randomUUID()
    const organization_id = randomUUID()
    const personal_organization_id = randomUUID()
    const domain_id = randomUUID()
    const now = Date.now()
    yield* db.transaction(
        Effect.gen(function* () {
            const tx = yield* Sql
            yield* tx.query(
                sql`INSERT INTO contacts (id,name,created_at,updated_at) VALUES (${contact_id},${input.name},${now},${now})`
            )
            yield* tx.query(
                sql`INSERT INTO contact_email_addresses (id,contact_id,email,is_primary,created_at,updated_at) VALUES (${randomUUID()},${contact_id},${email},true,${now},${now})`
            )
            yield* tx.query(
                sql`INSERT INTO organizations (id,name,slug,kind,max_domains,created_at,updated_at) VALUES (${personal_organization_id},${input.name},${`personal-${account_id}`},'personal',1,${now},${now})`
            )
            yield* tx.query(
                sql`INSERT INTO users (id,name,personal_organization_id,created_at,updated_at) VALUES (${account_id},${input.name},${personal_organization_id},${now},${now})`
            )
            yield* tx.query(
                sql`INSERT INTO auth_accounts (id,contact_id,login_email,created_at,updated_at) VALUES (${account_id},${contact_id},${email},${now},${now})`
            )
            yield* tx.query(
                sql`INSERT INTO account_password_credentials (account_id,password_hash,salt,algorithm,cost,block_size,parallelism,key_length,updated_at) VALUES (${account_id},${password.password_hash},${password.salt},'scrypt',32768,8,3,64,${now})`
            )
            yield* tx.query(
                sql`INSERT INTO organizations (id,name,slug,kind,max_domains,created_at,updated_at) VALUES (${organization_id},${input.name},${input.slug},'customer',1,${now},${now})`
            )
            yield* tx.query(
                sql`INSERT INTO organization_members (id,organization_id,user_id,role,status,created_at,updated_at) VALUES (${randomUUID()},${organization_id},${account_id},'owner','active',${now},${now})`
            )
            yield* tx.query(
                sql`INSERT INTO organization_members (id,organization_id,user_id,role,status,created_at,updated_at) VALUES (${randomUUID()},${personal_organization_id},${account_id},'owner','active',${now},${now})`
            )
            yield* tx.query(
                sql`INSERT INTO domains (id,organization_id,created_by_user_id,name,slug,publication_status,publication_access,created_at,updated_at) VALUES (${domain_id},${organization_id},${account_id},${input.name},${input.slug},'draft','public',${now},${now})`
            )
            yield* tx.query(
                sql`INSERT INTO domain_contacts (id,domain_id,contact_id,status,source,created_at,updated_at) VALUES (${randomUUID()},${domain_id},${contact_id},'active','owned_auth',${now},${now})`
            )
        })
    )
    return { account_id, contact_id, organization_id, domain_id }
})

/** Backfills the personal organization for accounts provisioned before this split. */
export const ensure_personal_organization = Effect.fn(
    "Auth.ensurePersonalOrganization"
)(function* (principal: AccountPrincipal) {
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const rows = yield* query_rows(
                PersonalOrganization,
                sql`SELECT personal_organization_id,name FROM users WHERE id=${principal.account_id} AND deleted_at IS NULL FOR UPDATE`
            )
            const account = rows[0]
            if (account === undefined)
                return yield* Effect.fail(failure("unauthenticated"))
            if (account.personal_organization_id !== null)
                return account.personal_organization_id

            const organization_id = randomUUID()
            const now = Date.now()
            const tx = yield* Sql
            yield* tx.query(
                sql`INSERT INTO organizations (id,name,slug,kind,max_domains,created_at,updated_at) VALUES (${organization_id},${account.name ?? "Personal"},${`personal-${principal.account_id}`},'personal',1,${now},${now})`
            )
            yield* tx.query(
                sql`INSERT INTO organization_members (id,organization_id,user_id,role,status,created_at,updated_at) VALUES (${randomUUID()},${organization_id},${principal.account_id},'owner','active',${now},${now})`
            )
            yield* tx.query(
                sql`UPDATE users SET personal_organization_id=${organization_id},updated_at=${now} WHERE id=${principal.account_id}`
            )
            return organization_id
        })
    )
})

/**
 * Authenticates within shared global and per-email admission limits.
 * Rotating email addresses bypasses a per-email limit, so atomic global admission
 * must precede identifier-row allocation and password hashing across replicas.
 * Bounded cleanup removes expired email-hash buckets without deleting counters
 * owned by other limiters. These limits also constrain legitimate login bursts.
 */
export const login_account = Effect.fn("Auth.login")(function* (
    value: unknown
) {
    const input = yield* Schema.decodeUnknownEffect(LoginInput)(value).pipe(
        Effect.mapError(() => failure("invalid_input"))
    )
    const email = input.email.trim().toLowerCase()
    const db = yield* Sql
    const now = Date.now()
    const window_start = Math.floor(now / (15 * 60 * 1000)) * (15 * 60 * 1000)
    const admission_window = Math.floor(now / 10_000) * 10_000
    const admission = yield* query_rows(
        Schema.Struct({ attempts: Schema.Number }),
        sql`INSERT INTO account_login_attempts (key,window_start,attempts)
            VALUES ('global-login',${admission_window},1)
            ON CONFLICT (key) DO UPDATE SET window_start=EXCLUDED.window_start,
                attempts=CASE WHEN account_login_attempts.window_start=EXCLUDED.window_start
                    THEN LEAST(account_login_attempts.attempts + 1,31) ELSE 1 END
            RETURNING attempts`
    )
    if ((admission[0]?.attempts ?? 31) > 30)
        return yield* Effect.fail(failure("rate_limited"))
    yield* db.query(sql`DELETE FROM account_login_attempts WHERE key IN (
        SELECT key FROM account_login_attempts
        WHERE key ~ '^[0-9a-f]{64}$' AND window_start < ${window_start}
        ORDER BY window_start,key LIMIT 100)`)
    const attempts = yield* query_rows(
        Schema.Struct({ attempts: Schema.Number }),
        sql`
        INSERT INTO account_login_attempts (key,window_start,attempts) VALUES (${token_hash(email)},${window_start},1)
        ON CONFLICT (key) DO UPDATE SET window_start = EXCLUDED.window_start,
            attempts = CASE WHEN account_login_attempts.window_start = EXCLUDED.window_start THEN LEAST(account_login_attempts.attempts + 1,11) ELSE 1 END
        RETURNING attempts`
    )
    if ((attempts[0]?.attempts ?? 100) > 10)
        return yield* Effect.fail(failure("rate_limited"))
    const credentials = yield* query_rows(
        Credential,
        sql`
        SELECT p.* FROM account_password_credentials p
        JOIN auth_accounts a ON a.id = p.account_id JOIN users u ON u.id = a.id
        WHERE a.login_email = ${email} AND a.disabled_at IS NULL AND u.deleted_at IS NULL`
    )
    const credential = credentials[0]
    const valid = yield* verify_account_password(input.password, credential)
    if (!valid || credential === undefined)
        return yield* Effect.fail(failure("invalid_credentials"))
    const token = randomBytes(32).toString("base64url")
    const session_id = randomUUID()
    const inserted = yield* db.transaction(
        Effect.gen(function* () {
            // Serialize against credential replacement/account disabling.
            const active = yield* query_rows(
                Id,
                sql`SELECT a.id FROM auth_accounts a JOIN users u ON u.id = a.id JOIN account_password_credentials p ON p.account_id = a.id
            WHERE a.id = ${credential.account_id} AND a.disabled_at IS NULL AND u.deleted_at IS NULL AND p.password_hash = ${credential.password_hash} FOR UPDATE OF a,p,u`
            )
            if (active.length === 0)
                return yield* Effect.fail(failure("invalid_credentials"))
            return yield* query_rows(
                Id,
                sql`INSERT INTO account_sessions (id,account_id,token_hash,created_at,last_seen_at,expires_at,absolute_expires_at)
            VALUES (${session_id},${credential.account_id},${token_hash(token)},${now},${now},${now + idle_ms},${now + absolute_ms}) RETURNING id`
            )
        })
    )
    if (inserted.length !== 1)
        return yield* Effect.fail(failure("invalid_credentials"))
    return { token, session_id, account_id: credential.account_id }
})

export const authenticate_token = Effect.fn("Auth.authenticate")(function* (
    token: string | undefined
) {
    if (token === undefined || !/^[A-Za-z0-9_-]{43}$/.test(token))
        return yield* Effect.fail(failure("unauthenticated"))
    const now = Date.now()
    const sessions = yield* query_rows(
        AccountPrincipal,
        sql`
        UPDATE account_sessions s SET last_seen_at = ${now}, expires_at = LEAST(${now + idle_ms}, s.absolute_expires_at)
        FROM auth_accounts a JOIN users u ON u.id = a.id
        WHERE s.account_id = a.id AND s.token_hash = ${token_hash(token)} AND s.revoked_at IS NULL
            AND s.expires_at > ${now} AND s.absolute_expires_at > ${now} AND a.disabled_at IS NULL AND u.deleted_at IS NULL
        RETURNING s.id AS session_id, a.id AS account_id, a.contact_id`
    )
    const principal = sessions[0]
    if (principal === undefined)
        return yield* Effect.fail(failure("unauthenticated"))
    return principal
})

/** Reads the canonical account profile for an active PostgreSQL session. */
export const account_profile = Effect.fn("Auth.accountProfile")(function* (
    principal: AccountPrincipal
) {
    const profiles = yield* query_rows(
        AccountProfile,
        sql`SELECT a.id,a.login_email AS email,COALESCE(NULLIF(u.name,''),a.login_email) AS display_name,NULL::text AS image_url
            FROM auth_accounts a JOIN users u ON u.id=a.id
            JOIN account_sessions s ON s.account_id=a.id
            WHERE a.id=${principal.account_id} AND s.id=${principal.session_id}
                AND a.disabled_at IS NULL AND u.deleted_at IS NULL
                AND s.revoked_at IS NULL AND s.expires_at>${Date.now()}
                AND s.absolute_expires_at>${Date.now()}`
    )
    const profile = profiles[0]
    if (profile === undefined)
        return yield* Effect.fail(failure("unauthenticated"))
    return profile
})

export const revoke_token = Effect.fn("Auth.logout")(function* (
    token: string | undefined
) {
    if (token === undefined) return
    const db = yield* Sql
    yield* db.query(
        sql`UPDATE account_sessions SET revoked_at = ${Date.now()} WHERE token_hash = ${token_hash(token)} AND revoked_at IS NULL`
    )
})

export const session_token = (request: Request): string | undefined => {
    const values = (request.headers.get("cookie") ?? "")
        .split(";")
        .map((part) => part.trim())
        .filter((part) => part.startsWith("urm_account="))
    if (values.length !== 1) return undefined
    return values[0]?.slice("urm_account=".length)
}

export const require_account_domain = Effect.fn("Auth.requireDomain")(
    function* (
        principal: AccountPrincipal,
        domain_id: string,
        write = false,
        module:
            | "Mail"
            | "Media"
            | "Tags"
            | "Documents"
            | "Blog"
            | "Events"
            | "Issues"
            | "Projects"
            | "Shop"
            | "Data"
            | null = "Mail"
    ) {
        const access = yield* query_rows(
            Id,
            sql`
        SELECT d.id FROM domains d JOIN organizations o ON o.id = d.organization_id
        JOIN organization_members m ON m.organization_id = o.id
        JOIN auth_accounts a ON a.id = m.user_id JOIN users u ON u.id = a.id
        JOIN account_sessions s ON s.account_id = a.id
        WHERE d.id = ${domain_id} AND a.id = ${principal.account_id} AND a.disabled_at IS NULL AND u.deleted_at IS NULL
            AND o.deleted_at IS NULL AND m.status = 'active' AND m.deleted_at IS NULL
            AND (${!write} OR m.role IN ('owner','admin','sysadmin'))
            AND (${module}::text IS NULL OR d.enabled_modules IS NULL OR ${module} = ANY(d.enabled_modules))
            AND s.id = ${principal.session_id} AND s.revoked_at IS NULL AND s.expires_at > ${Date.now()} AND s.absolute_expires_at > ${Date.now()} FOR SHARE OF d,o,m,a,u,s`
        )
        if (access.length === 0) return yield* Effect.fail(failure("forbidden"))
    }
)

export const list_account_domains = Effect.fn("Auth.listAccountDomains")(
    function* (principal: AccountPrincipal) {
        return yield* query_rows(
            AccountDomain,
            sql`
            SELECT d.id, d.slug, d.name, o.name AS organization_name,
                (m.role IN ('owner', 'admin', 'sysadmin')) AS can_write
            FROM domains d JOIN organizations o ON o.id = d.organization_id
            JOIN organization_members m ON m.organization_id = o.id
            JOIN auth_accounts a ON a.id = m.user_id JOIN users u ON u.id = a.id
            JOIN account_sessions s ON s.account_id = a.id
            WHERE a.id = ${principal.account_id} AND a.disabled_at IS NULL
                AND u.deleted_at IS NULL AND o.deleted_at IS NULL
                AND m.status = 'active' AND m.deleted_at IS NULL
                AND s.id = ${principal.session_id} AND s.revoked_at IS NULL
                AND s.expires_at > ${Date.now()} AND s.absolute_expires_at > ${Date.now()}
            ORDER BY o.name, d.name, d.id
        `
        )
    }
)
