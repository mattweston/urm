import { readFile, readdir } from "node:fs/promises"
import { PGlite } from "@electric-sql/pglite"
import { describe, expect, it } from "vitest"

describe("social PostgreSQL migration", () => {
    it("binds each provider profile to one domain and each retry key to one post", async () => {
        const pg = new PGlite()
        try {
            const base = new URL("../src/migrations/", import.meta.url)
            for (const entry of (await readdir(base, { withFileTypes: true }))
                .filter((candidate) => candidate.isDirectory())
                .sort((left, right) => left.name.localeCompare(right.name))) {
                await pg.exec(
                    await readFile(
                        new URL(`${entry.name}/migration.sql`, base),
                        "utf8"
                    )
                )
            }
            await pg.exec(`
                INSERT INTO users (id,created_at,updated_at) VALUES ('owner',1,1);
                INSERT INTO organizations (id,name,slug,kind,max_domains,created_at,updated_at)
                    VALUES ('org','Organization','organization','personal',2,1,1);
                INSERT INTO domains (id,organization_id,created_by_user_id,name,slug,updated_at,publication_status,publication_access)
                    VALUES ('one','org','owner','One','one',1,'draft','public'),
                           ('two','org','owner','Two','two',1,'draft','public'),
                           ('three','org','owner','Three','three',1,'draft','public');
                INSERT INTO social_provider_profiles (domain_id,provider_profile_id,created_at)
                    VALUES ('one','provider-one',1),('two','provider-two',1);
                INSERT INTO social_accounts (domain_id,account_id,provider_profile_id,platform,username,active,synced_at)
                    VALUES ('one','account-one','provider-one','facebook','one',true,1);
                INSERT INTO social_posts (id,domain_id,idempotency_key,content,account_ids,media_ids,media_urls,platforms,test_mode,created_by_user_id,created_at,updated_at)
                    VALUES ('post-one','one','retry-one','Hello',ARRAY['account-one'],ARRAY[]::text[],ARRAY[]::text[],'[]',true,'owner',1,1);
            `)
            await expect(
                pg.exec(
                    `INSERT INTO social_provider_profiles (domain_id,provider_profile_id,created_at) VALUES ('three','provider-one',1)`
                )
            ).rejects.toThrow(/social_provider_profiles_provider_unique/)
            await expect(
                pg.exec(
                    `INSERT INTO social_accounts (domain_id,account_id,provider_profile_id,platform,username,active,synced_at) VALUES ('two','account-two','provider-one','facebook','two',true,1)`
                )
            ).rejects.toThrow(/foreign key constraint/)
            await expect(
                pg.exec(
                    `INSERT INTO social_posts (id,domain_id,idempotency_key,content,account_ids,media_ids,media_urls,platforms,test_mode,created_by_user_id,created_at,updated_at) VALUES ('post-two','one','retry-one','Again',ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],'[]',true,'owner',1,1)`
                )
            ).rejects.toThrow(/social_posts_domain_key_unique/)
            const result = await pg.query<{ count: number }>(
                "SELECT count(*)::int AS count FROM social_posts WHERE domain_id='one'"
            )
            expect(result.rows[0]?.count).toBe(1)
        } finally {
            await pg.close()
        }
    }, 30_000)
})
