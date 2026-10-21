SET LOCAL lock_timeout = '5s';--> statement-breakpoint
ALTER TABLE "domain_contacts"
    ADD COLUMN "display_name" varchar(255),
    ADD COLUMN "tel" varchar(50),
    ADD COLUMN "title" varchar(255),
    ADD COLUMN "company" varchar(255);
