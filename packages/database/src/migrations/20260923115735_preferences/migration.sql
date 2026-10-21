CREATE TABLE "appearance_preferences" (
	"profile_key" text PRIMARY KEY,
	"theme" text NOT NULL,
	"font" text NOT NULL,
	"code_font" text NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sidebar_preferences" (
	"user_id" text,
	"domain_id" text,
	"sidebar_order" text[] NOT NULL,
	"hidden_modules" text[] NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "sidebar_preferences_pkey" PRIMARY KEY("user_id","domain_id")
);
--> statement-breakpoint
CREATE TABLE "spotify_preferences" (
	"profile_key" text PRIMARY KEY,
	"playlist_id" text NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appearance_preferences" ADD CONSTRAINT "appearance_preferences_profile_key_users_id_fkey" FOREIGN KEY ("profile_key") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sidebar_preferences" ADD CONSTRAINT "sidebar_preferences_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sidebar_preferences" ADD CONSTRAINT "sidebar_preferences_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "spotify_preferences" ADD CONSTRAINT "spotify_preferences_profile_key_users_id_fkey" FOREIGN KEY ("profile_key") REFERENCES "users"("id") ON DELETE CASCADE;