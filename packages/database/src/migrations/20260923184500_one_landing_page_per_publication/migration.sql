CREATE TABLE "landing_page_archives" (
    "id" text PRIMARY KEY,
    "domain_id" text NOT NULL,
    "subdomain_id" text,
    "archived_page" jsonb NOT NULL,
    "archived_at" bigint NOT NULL,
    "reason" text NOT NULL
);
--> statement-breakpoint
WITH ranked AS (
    SELECT id,
        row_number() OVER (
            PARTITION BY domain_id, subdomain_id
            ORDER BY is_homepage DESC, updated_at DESC, id DESC
        ) AS position
    FROM pages
    WHERE content_type = 'landing_json'
)
INSERT INTO landing_page_archives (id, domain_id, subdomain_id, archived_page, archived_at, reason)
SELECT p.id, p.domain_id, p.subdomain_id, to_jsonb(p),
    (extract(epoch FROM clock_timestamp()) * 1000)::bigint,
    'one_landing_page_per_publication'
FROM pages p
JOIN ranked r ON r.id = p.id
WHERE r.position > 1;
--> statement-breakpoint
DELETE FROM pages p
USING landing_page_archives a
WHERE p.id = a.id AND a.reason = 'one_landing_page_per_publication';
--> statement-breakpoint
CREATE UNIQUE INDEX "pages_root_landing_unique" ON "pages" ("domain_id")
    WHERE "subdomain_id" IS NULL AND "content_type" = 'landing_json';
--> statement-breakpoint
CREATE UNIQUE INDEX "pages_subdomain_landing_unique" ON "pages" ("domain_id", "subdomain_id")
    WHERE "subdomain_id" IS NOT NULL AND "content_type" = 'landing_json';
