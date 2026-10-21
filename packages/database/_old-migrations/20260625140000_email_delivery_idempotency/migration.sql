ALTER TABLE "email_deliveries" ADD COLUMN "idempotency_key" varchar(255);-->statement-breakpoint
CREATE UNIQUE INDEX "email_deliveries_idempotency_key_unique" ON "email_deliveries" ("idempotency_key");
