import { readFile, readdir } from "node:fs/promises"
import { PGlite } from "@electric-sql/pglite"
import { describe, expect, it } from "vitest"

describe("preference PostgreSQL migration", () => {
    it("enforces one preference per user and one sidebar record per user and domain", async () => {
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
                INSERT INTO users (id,created_at,updated_at) VALUES ('one',1,1),('two',1,1);
                INSERT INTO organizations (id,name,slug,kind,max_domains,created_at,updated_at)
                    VALUES ('org','Organization','organization','personal',2,1,1);
                INSERT INTO domains (id,organization_id,created_by_user_id,name,slug,updated_at,publication_status,publication_access)
                    VALUES ('domain','org','one','Domain','domain',1,'draft','public');
                INSERT INTO appearance_preferences (profile_key,theme,font,code_font,updated_at)
                    VALUES ('one','dark','inter','theme',1);
                INSERT INTO spotify_preferences (profile_key,playlist_id,updated_at)
                    VALUES ('one','6cLVRosXIz2b7mA7smCfKf',1);
                INSERT INTO sidebar_preferences (user_id,domain_id,sidebar_order,hidden_modules,updated_at)
                    VALUES ('one','domain',ARRAY['Mail'],ARRAY[]::text[],1),
                           ('two','domain',ARRAY['Blog'],ARRAY[]::text[],1);
            `)
            await expect(
                pg.exec(`INSERT INTO appearance_preferences (profile_key,theme,font,code_font,updated_at)
                    VALUES ('one','light','theme','theme',2)`)
            ).rejects.toThrow(/appearance_preferences_pkey/)
            await expect(
                pg.exec(`INSERT INTO sidebar_preferences (user_id,domain_id,sidebar_order,hidden_modules,updated_at)
                    VALUES ('one','domain',ARRAY[]::text[],ARRAY[]::text[],2)`)
            ).rejects.toThrow(/sidebar_preferences_pkey/)
            await expect(
                pg.exec(`INSERT INTO spotify_preferences (profile_key,playlist_id,updated_at)
                    VALUES ('missing','6cLVRosXIz2b7mA7smCfKf',1)`)
            ).rejects.toThrow(/foreign key constraint/)
            const rows = await pg.query<{ user_id: string; sidebar_order: string[] }>(
                "SELECT user_id,sidebar_order FROM sidebar_preferences WHERE domain_id='domain' ORDER BY user_id"
            )
            expect(rows.rows).toEqual([
                { user_id: "one", sidebar_order: ["Mail"] },
                { user_id: "two", sidebar_order: ["Blog"] },
            ])
        } finally {
            await pg.close()
        }
    }, 30_000)
})
