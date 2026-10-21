import { sql } from "drizzle-orm"
import { Effect, Layer, Schema } from "effect"
import { DatabaseLive, loadEnvironmentConfig } from "@urm/database"
import { Sql, SqlLive, query_rows } from "@urm/database/sql"

const Account = Schema.Struct({
    id: Schema.String,
    name: Schema.NullOr(Schema.String),
    platform_role: Schema.NullOr(Schema.String),
})
const Membership = Schema.Struct({ id: Schema.String })
const Domain = Schema.Struct({ organization_id: Schema.String })

const option = (name: string) =>
    process.argv
        .slice(2)
        .find((argument) => argument.startsWith(`--${name}=`))
        ?.slice(name.length + 3)

const email = option("email")?.trim().toLowerCase()
const expected_name = option("name")?.trim()
const scope = option("scope")
const domain_slug = option("domain-slug")
const confirmation = option("confirm")
const expected_confirmation =
    scope === "platform"
        ? `grant:${email}:platform`
        : `grant:${email}:tenant:${domain_slug}`

if (
    email === undefined ||
    !email.includes("@") ||
    expected_name === undefined ||
    expected_name.length === 0 ||
    (scope !== "platform" && scope !== "tenant") ||
    (scope === "tenant" && !domain_slug) ||
    confirmation !== expected_confirmation
) {
    console.error(
        "Usage: pnpm --filter server auth:grant-sysadmin --email=<exact-login-email> --name='<expected account name>' --scope=platform --confirm=grant:<email>:platform"
    )
    console.error(
        "Tenant scope: use --scope=tenant --domain-slug=<slug> --confirm=grant:<email>:tenant:<slug>"
    )
    process.exitCode = 1
} else {
    const grant = Effect.gen(function* () {
        const environment = yield* loadEnvironmentConfig
        if (environment.env !== "development")
            return yield* Effect.fail(
                new Error("Account Sysadmin grant is restricted to development")
            )
        const db = yield* Sql
        const accounts = yield* query_rows(
            Account,
            sql`SELECT a.id,u.name,u.platform_role
                FROM auth_accounts a JOIN users u ON u.id=a.id
                WHERE a.login_email=${email} AND a.disabled_at IS NULL
                    AND u.deleted_at IS NULL LIMIT 2`
        )
        const account = accounts[0]
        if (accounts.length !== 1 || account?.name !== expected_name)
            return yield* Effect.fail(
                new Error("Active account and expected name did not match")
            )
        if (scope === "platform") {
            yield* db.query(
                sql`UPDATE users SET platform_role='platform_sysadmin',
                    updated_at=${Date.now()}
                    WHERE id=${account.id} AND deleted_at IS NULL`
            )
            return {
                account_id: account.id,
                scope: "platform",
                already_granted: account.platform_role === "platform_sysadmin",
            }
        }
        const domains = yield* query_rows(
            Domain,
            sql`SELECT d.organization_id FROM domains d
                JOIN organizations o ON o.id=d.organization_id
                WHERE d.slug=${domain_slug} AND o.deleted_at IS NULL LIMIT 2`
        )
        const domain = domains[0]
        if (domains.length !== 1 || domain === undefined)
            return yield* Effect.fail(new Error("Workspace slug did not match"))
        const memberships = yield* query_rows(
            Membership,
            sql`SELECT id FROM organization_members
                WHERE organization_id=${domain.organization_id}
                    AND user_id=${account.id} AND status='active'
                    AND deleted_at IS NULL LIMIT 2`
        )
        const membership = memberships[0]
        if (memberships.length !== 1 || membership === undefined)
            return yield* Effect.fail(
                new Error("Active workspace membership required")
            )
        yield* db.query(
            sql`UPDATE organization_members SET role='sysadmin',
                updated_at=${Date.now()} WHERE id=${membership.id}`
        )
        return { account_id: account.id, scope: "tenant" }
    })
    const result = await Effect.runPromise(
        grant.pipe(Effect.provide(SqlLive.pipe(Layer.provide(DatabaseLive))))
    )
    console.log(JSON.stringify(result))
}
