import { readFile, readdir } from "node:fs/promises"
import { PGlite } from "@electric-sql/pglite"
import { describe, expect, it } from "vitest"

describe("design PostgreSQL migration", () => {
    it("stores organization drafts and rejects invalid ownership or revisions", async () => {
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
                INSERT INTO users (id,created_at,updated_at) VALUES ('author',1,1);
                INSERT INTO organizations (id,name,slug,kind,max_domains,created_at,updated_at)
                    VALUES ('org','Organization','organization','personal',2,1,1);
                INSERT INTO domains (id,organization_id,created_by_user_id,name,slug,updated_at,publication_status,publication_access)
                    VALUES ('domain','org','author','Domain','domain',1,'draft','public');
                INSERT INTO logos (id,domain_id,organization_id,name,scene,revision,created_by_user_id,updated_by_user_id,created_at,updated_at)
                    VALUES ('logo','domain','org','Logo','{}',1,'author','author',1,1);
                INSERT INTO landing_templates (id,organization_id,name,document,revision,created_by_user_id,updated_by_user_id,created_at,updated_at)
                    VALUES ('template','org','Landing','{}',1,'author','author',1,1);
            `)
            await expect(
                pg.exec(`INSERT INTO logos (id,domain_id,organization_id,name,scene,revision,created_by_user_id,updated_by_user_id,created_at,updated_at)
                    VALUES ('bad','domain','org','', '{}',1,'author','author',1,1)`)
            ).rejects.toThrow(/logos_name_length_check/)
            await expect(
                pg.exec(`INSERT INTO landing_templates (id,organization_id,name,document,revision,created_by_user_id,updated_by_user_id,created_at,updated_at)
                    VALUES ('bad','org','Landing','{}',0,'author','author',1,1)`)
            ).rejects.toThrow(/landing_templates_revision_check/)
            await expect(
                pg.exec(`INSERT INTO logos (id,domain_id,organization_id,name,scene,revision,created_by_user_id,updated_by_user_id,created_at,updated_at)
                    VALUES ('orphan','missing','org','Logo','{}',1,'author','author',1,1)`)
            ).rejects.toThrow(/foreign key constraint/)
            const rows = await pg.query<{ id: string }>(
                "SELECT id FROM landing_templates WHERE organization_id='org'"
            )
            expect(rows.rows).toEqual([{ id: "template" }])
        } finally {
            await pg.close()
        }
    }, 30_000)
})
