import { randomUUID } from "node:crypto"
import { Effect, Schema } from "effect"
import { sql } from "drizzle-orm"
import { Sql, query_rows } from "@urm/database/sql"
const Id = Schema.Struct({ id: Schema.String })
export const upsert_directory_tag = Effect.fn("Tags.upsertDirectory")(
    function* (
        domain_id: string,
        target_key: string,
        kind: "role" | "person",
        name: string,
        color: string,
        description: string
    ) {
        const db = yield* Sql
        const existing = yield* query_rows(
            Id,
            sql`SELECT id FROM tags WHERE domain_id=${domain_id} AND target_key=${target_key}`
        )
        const id = existing[0]?.id ?? randomUUID()
        // Custom and directory tags share a unique name namespace. Never overwrite a custom tag.
        const collisions = yield* query_rows(
            Id,
            sql`SELECT id FROM tags WHERE domain_id=${domain_id} AND name=${name} AND id<>${id}`
        )
        const unique_name =
            collisions.length === 0
                ? name
                : `${name.slice(0, 170)} (${target_key})`
        const now = Date.now()
        yield* db.query(sql`INSERT INTO tags (id,domain_id,name,color,description,kind,target_key,created_at,updated_at)
            VALUES (${id},${domain_id},${unique_name},${color},${description},${kind},${target_key},${now},${now})
            ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,color=EXCLUDED.color,description=EXCLUDED.description,kind=EXCLUDED.kind,updated_at=EXCLUDED.updated_at
            WHERE tags.name IS DISTINCT FROM EXCLUDED.name OR tags.color IS DISTINCT FROM EXCLUDED.color OR tags.description IS DISTINCT FROM EXCLUDED.description OR tags.kind IS DISTINCT FROM EXCLUDED.kind`)
        return id
    }
)
