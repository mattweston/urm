/**
 * # Database Env Config
 *
 * DbConfig – Postgres connection URL for Zero / Drizzle.
 * Env: ZERO_UPSTREAM_DB or DATABASE_URL (optional in config; required at runtime for db provider).
 *
 * ## Resources
 *
 * - [Example Database Config Layer](https://www.effect.solutions/config#example-database-config-layer)
 */
import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"

export class DbConfig extends Context.Service<
    DbConfig,
    {
        readonly databaseUrl: string
    }
>()("DbConfig") {
    static readonly layer = Layer.effect(
        DbConfig,
        Effect.gen(function* () {
            const config = yield* Config.all({
                databaseUrl: Config.option(Config.string("DATABASE_URL")),
                databaseUrlSQLite: Config.option(
                    Config.string("DATABASE_URL_SQLITE")
                ),
            }).pipe(
                Config.map((c) => {
                    const url =
                        Option.getOrElse(c.databaseUrl, () => "") ||
                        Option.getOrElse(c.databaseUrlSQLite, () => "")
                    return { databaseUrl: url }
                })
            )
            return DbConfig.of(config)
        })
    )
}

export const DbConfigLive = DbConfig.layer
