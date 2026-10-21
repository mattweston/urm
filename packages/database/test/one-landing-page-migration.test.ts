import { readFile, readdir } from "node:fs/promises"
import { PGlite } from "@electric-sql/pglite"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

const pg = new PGlite()
const migration_name = "20260923184500_one_landing_page_per_publication"

beforeAll(async () => {
    const base = new URL("../src/migrations/", import.meta.url)
    for (const entry of (await readdir(base, { withFileTypes: true }))
        .filter(
            (candidate) =>
                candidate.isDirectory() && candidate.name < migration_name
        )
        .sort((left, right) => left.name.localeCompare(right.name))) {
        await pg.exec(
            await readFile(new URL(`${entry.name}/migration.sql`, base), "utf8")
        )
    }
    await pg.exec(`
        INSERT INTO users (id,created_at,updated_at) VALUES ('owner',1,1);
        INSERT INTO organizations (id,name,slug,kind,max_domains,created_at,updated_at)
            VALUES ('org','One','one','personal',2,1,1);
        INSERT INTO domains (id,organization_id,created_by_user_id,name,slug,updated_at,publication_status,publication_access)
            VALUES ('domain-one','org','owner','One','domain-one',1,'draft','public'),
                   ('domain-two','org','owner','Two','domain-two',1,'draft','public');
        INSERT INTO subdomains (id,domain_id,name,slug,kind,status,access,created_at,updated_at)
            VALUES ('sub-one','domain-one','Docs','docs','subdomain','draft','public',1,1);
        INSERT INTO pages (id,domain_id,subdomain_id,title,content,content_type,slug,navigation_label,show_in_navigation,order_position,is_homepage,publication_state,noindex,created_at,updated_at)
            VALUES ('selected','domain-one',NULL,'Selected','{}','landing_json',NULL,'Selected',false,0,true,'draft',true,1,10),
                   ('extra','domain-one',NULL,'Extra','{}','landing_json',NULL,'Extra',false,1,false,'draft',true,1,20),
                   ('other-domain','domain-two',NULL,'Other','{}','landing_json',NULL,'Other',false,0,false,'draft',true,1,1),
                   ('subdomain','domain-one','sub-one','Subdomain','{}','landing_json',NULL,'Subdomain',false,0,false,'draft',true,1,1);
    `)
    await pg.exec(
        await readFile(new URL(`${migration_name}/migration.sql`, base), "utf8")
    )
}, 30_000)
afterAll(async () => pg.close())

describe("one landing page per publication migration", () => {
    it("retains the selected homepage, archives the extra draft and preserves separate publications", async () => {
        const pages = await pg.query<{ id: string }>(
            "SELECT id FROM pages ORDER BY id"
        )
        expect(pages.rows.map((page) => page.id)).toEqual([
            "other-domain",
            "selected",
            "subdomain",
        ])
        const archives = await pg.query<{
            id: string
            archived_page: { title: string }
        }>("SELECT id,archived_page FROM landing_page_archives")
        expect(archives.rows).toEqual([
            expect.objectContaining({
                id: "extra",
                archived_page: expect.objectContaining({ title: "Extra" }),
            }),
        ])
        await expect(
            pg.exec(`INSERT INTO pages (id,domain_id,title,content,content_type,navigation_label,show_in_navigation,order_position,is_homepage,publication_state,noindex,created_at,updated_at)
                VALUES ('duplicate','domain-one','Duplicate','{}','landing_json','Duplicate',false,2,false,'draft',true,1,30)`)
        ).rejects.toThrow("duplicate key value violates unique constraint")
        await expect(
            pg.exec(`INSERT INTO pages (id,domain_id,subdomain_id,title,content,content_type,navigation_label,show_in_navigation,order_position,is_homepage,publication_state,noindex,created_at,updated_at)
                VALUES ('sub-duplicate','domain-one','sub-one','Duplicate','{}','landing_json','Duplicate',false,2,false,'draft',true,1,30)`)
        ).rejects.toThrow("duplicate key value violates unique constraint")
        await pg.exec(`INSERT INTO pages (id,domain_id,title,content,content_type,slug,navigation_label,show_in_navigation,order_position,is_homepage,publication_state,noindex,created_at,updated_at)
            VALUES ('document','domain-one','Document','{}','rich_text_json','document','Document',true,2,false,'draft',true,1,30)`)
    })
})
