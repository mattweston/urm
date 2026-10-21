CREATE TABLE "chat_messages" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"author_kind" text NOT NULL,
	"author_user_id" text,
	"author_name" text NOT NULL,
	"body" text NOT NULL,
	"mentions" jsonb NOT NULL,
	"mentioned_user_ids" jsonb NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE INDEX "chat_messages_domain_created_idx" ON "chat_messages" ("domain_id","created_at","id");--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_author_user_id_users_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT;