CREATE TABLE "account_login_attempts" (
	"key" text PRIMARY KEY,
	"window_start" bigint NOT NULL,
	"attempts" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_password_credentials" (
	"account_id" text PRIMARY KEY,
	"password_hash" text NOT NULL,
	"salt" text NOT NULL,
	"algorithm" text DEFAULT 'scrypt' NOT NULL,
	"cost" integer NOT NULL,
	"block_size" integer NOT NULL,
	"parallelism" integer NOT NULL,
	"key_length" integer NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "account_password_scrypt" CHECK ("algorithm" = 'scrypt')
);
--> statement-breakpoint
CREATE TABLE "account_sessions" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" bigint NOT NULL,
	"last_seen_at" bigint NOT NULL,
	"expires_at" bigint NOT NULL,
	"absolute_expires_at" bigint NOT NULL,
	"revoked_at" bigint,
	CONSTRAINT "account_sessions_expiry_bound" CHECK ("expires_at" <= "absolute_expires_at")
);
--> statement-breakpoint
CREATE TABLE "auth_accounts" (
	"id" text PRIMARY KEY,
	"contact_id" text,
	"login_email" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"disabled_at" bigint,
	CONSTRAINT "auth_accounts_normalized_email" CHECK ("login_email" = lower(trim("login_email")))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "account_sessions_token_hash_unique" ON "account_sessions" ("token_hash");--> statement-breakpoint
CREATE INDEX "account_sessions_account_idx" ON "account_sessions" ("account_id");--> statement-breakpoint
CREATE INDEX "account_sessions_expiry_idx" ON "account_sessions" ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_accounts_login_email_unique" ON "auth_accounts" ("login_email");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_accounts_contact_unique" ON "auth_accounts" ("contact_id");--> statement-breakpoint
ALTER TABLE "account_password_credentials" ADD CONSTRAINT "account_password_credentials_account_id_auth_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "auth_accounts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "account_sessions" ADD CONSTRAINT "account_sessions_account_id_auth_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "auth_accounts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_id_users_id_fkey" FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT;