CREATE TYPE "content_type" AS ENUM('markdown', 'html', 'plain');--> statement-breakpoint
CREATE TYPE "csv_upload_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "email_status" AS ENUM('queued', 'sent', 'delivered', 'bounced', 'complained', 'failed');--> statement-breakpoint
CREATE TYPE "email_type" AS ENUM('order_confirmation', 'order_shipped', 'order_delivered', 'payment_success', 'payment_failed', 'test_email');--> statement-breakpoint
CREATE TYPE "fulfillment_status" AS ENUM('unfulfilled', 'partial', 'fulfilled', 'cancelled');--> statement-breakpoint
CREATE TYPE "issue_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "issue_status" AS ENUM('backlog', 'todo', 'in_progress', 'done', 'cancelled');--> statement-breakpoint
CREATE TYPE "menu_category" AS ENUM('appetizer', 'main', 'dessert', 'drink', 'special');--> statement-breakpoint
CREATE TYPE "order_status" AS ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "payment_status" AS ENUM('pending', 'processing', 'succeeded', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "role" AS ENUM('user', 'member', 'admin');--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" varchar(255) PRIMARY KEY,
	"cart_id" varchar(255) NOT NULL,
	"product_id" varchar(255) NOT NULL,
	"product_variant_id" varchar(255) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"product_name" varchar(500) NOT NULL,
	"product_slug" varchar(500) NOT NULL,
	"product_image_url" varchar(2048) NOT NULL,
	"product_price" integer NOT NULL,
	"variant_name" varchar(255) NOT NULL,
	"variant_options" json DEFAULT '{}' NOT NULL,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" varchar(255) PRIMARY KEY,
	"session_id" varchar(255),
	"customer_id" varchar(255),
	"user_id" varchar(255),
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"total_items" integer,
	"selected_items" integer,
	"total_value" integer,
	"selected_value" integer,
	"last_activity" integer,
	"is_abandoned" boolean DEFAULT false,
	"abandoned_at" integer,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" varchar(255) PRIMARY KEY,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"tel" varchar(50),
	"title" varchar(255),
	"company" varchar(255),
	"user_id" varchar(255) NOT NULL,
	"updated_at" integer NOT NULL,
	"deleted_at" integer
);
--> statement-breakpoint
CREATE TABLE "csv_data" (
	"id" varchar(255) PRIMARY KEY,
	"upload_id" varchar(255) NOT NULL,
	"row_index" integer NOT NULL,
	"data" text NOT NULL,
	"updated_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "csv_uploads" (
	"id" varchar(255) PRIMARY KEY,
	"filename" varchar(500) NOT NULL,
	"row_count" integer NOT NULL,
	"status" "csv_upload_status" DEFAULT 'pending'::"csv_upload_status" NOT NULL,
	"updated_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" varchar(255) PRIMARY KEY,
	"email" varchar(255) NOT NULL,
	"first_name" varchar(255),
	"last_name" varchar(255),
	"phone" varchar(50),
	"stripe_customer_id" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL,
	"deleted_at" integer
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" varchar(255) PRIMARY KEY,
	"title" varchar(500) NOT NULL,
	"content" text NOT NULL,
	"content_type" "content_type" DEFAULT 'markdown'::"content_type" NOT NULL,
	"slug" varchar(500),
	"published" boolean DEFAULT false NOT NULL,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL,
	"deleted_at" integer
);
--> statement-breakpoint
CREATE TABLE "email_notifications" (
	"id" varchar(255) PRIMARY KEY,
	"email_id" varchar(255) NOT NULL,
	"to" varchar(255) NOT NULL,
	"from" varchar(255) NOT NULL,
	"subject" varchar(500) NOT NULL,
	"type" "email_type" NOT NULL,
	"order_id" varchar(255),
	"customer_id" varchar(255),
	"status" "email_status" DEFAULT 'queued'::"email_status" NOT NULL,
	"error_message" varchar(1000),
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity_tags" (
	"id" varchar(255) PRIMARY KEY,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" varchar(255) NOT NULL,
	"tag_id" varchar(255) NOT NULL,
	"updated_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_menu_items" (
	"id" varchar(255) PRIMARY KEY,
	"title" varchar(500) NOT NULL,
	"description" text,
	"content" text,
	"price" integer NOT NULL,
	"category" "menu_category" NOT NULL,
	"slug" varchar(500) NOT NULL,
	"image_url" varchar(2048),
	"dietary_labels" varchar(500),
	"allergens" varchar(500),
	"published" boolean DEFAULT false NOT NULL,
	"order_position" integer DEFAULT 0 NOT NULL,
	"updated_at" integer NOT NULL,
	"deleted_at" integer
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" varchar(255) PRIMARY KEY,
	"title" varchar(500) NOT NULL,
	"description" text,
	"date" integer NOT NULL,
	"start_time" varchar(10) NOT NULL,
	"end_time" varchar(10),
	"venue_name" varchar(500) NOT NULL,
	"venue_url" varchar(2048),
	"latitude" varchar(50) NOT NULL,
	"longitude" varchar(50) NOT NULL,
	"tickets_url" varchar(2048),
	"image_url" varchar(2048),
	"published" boolean DEFAULT false NOT NULL,
	"updated_at" integer NOT NULL,
	"deleted_at" integer
);
--> statement-breakpoint
CREATE TABLE "images" (
	"id" varchar(255) PRIMARY KEY,
	"url" varchar(2048) NOT NULL,
	"alt" varchar(500) NOT NULL,
	"text" text NOT NULL,
	"width" integer,
	"height" integer,
	"category" varchar(100),
	"order_position" integer DEFAULT 0 NOT NULL,
	"updated_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issue_labels" (
	"id" varchar(255) PRIMARY KEY,
	"name" varchar(255) NOT NULL,
	"color" varchar(50) NOT NULL,
	"description" text,
	"updated_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" varchar(255) PRIMARY KEY,
	"title" varchar(500) NOT NULL,
	"description" text,
	"content" text,
	"status" "issue_status" DEFAULT 'backlog'::"issue_status" NOT NULL,
	"priority" "issue_priority",
	"labels" varchar(1000),
	"assignee_id" varchar(255),
	"order_position" integer DEFAULT 0 NOT NULL,
	"updated_at" integer NOT NULL,
	"deleted_at" integer
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" varchar(255) PRIMARY KEY,
	"first" varchar(255) NOT NULL,
	"last" varchar(255) NOT NULL,
	"twitter" varchar(255),
	"avatar" varchar(2048),
	"notes" text,
	"updated_at" integer NOT NULL,
	"deleted_at" integer
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar(255) PRIMARY KEY,
	"author" varchar(255),
	"user" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"timestamp" integer,
	"updated_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" varchar(255) PRIMARY KEY,
	"order_id" varchar(255) NOT NULL,
	"product_id" varchar(255) NOT NULL,
	"product_variant_id" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" integer NOT NULL,
	"total_price" integer NOT NULL,
	"product_name" varchar(500) NOT NULL,
	"product_slug" varchar(500) NOT NULL,
	"product_image_url" varchar(2048) NOT NULL,
	"variant_name" varchar(255) NOT NULL,
	"variant_options" json DEFAULT '{}' NOT NULL,
	"fulfillment_status" "fulfillment_status" DEFAULT 'unfulfilled'::"fulfillment_status" NOT NULL,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar(255) PRIMARY KEY,
	"number" integer NOT NULL UNIQUE,
	"customer_id" varchar(255),
	"customer_email" varchar(255) NOT NULL,
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"subtotal" integer NOT NULL,
	"tax_amount" integer,
	"shipping_amount" integer,
	"discount_amount" integer,
	"total" integer NOT NULL,
	"billing_address" json NOT NULL,
	"shipping_address" json NOT NULL,
	"status" "order_status" DEFAULT 'pending'::"order_status" NOT NULL,
	"stripe_payment_intent_id" varchar(255),
	"stripe_charge_id" varchar(255),
	"stripe_checkout_session_id" varchar(255),
	"shipping_tracking_number" varchar(255),
	"shipping_carrier" varchar(100),
	"shipped_at" integer,
	"delivered_at" integer,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL,
	"deleted_at" integer
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" varchar(255) PRIMARY KEY,
	"text" text NOT NULL,
	"stripe_id" varchar(255),
	"stripe_customer_id" varchar(255),
	"stripe_payment_intent_id" varchar(255),
	"order_id" varchar(255),
	"message_id" varchar(255),
	"amount" integer,
	"currency" varchar(10),
	"status" "payment_status" DEFAULT 'pending'::"payment_status" NOT NULL,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "preferences" (
	"id" varchar(255) PRIMARY KEY,
	"user_id" varchar(255) NOT NULL,
	"theme" varchar(50) DEFAULT 'system' NOT NULL,
	"language" varchar(10) DEFAULT 'en' NOT NULL,
	"notifications" boolean DEFAULT true NOT NULL,
	"updated_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_collections" (
	"id" varchar(255) PRIMARY KEY,
	"name" varchar(255) NOT NULL,
	"slug" varchar(500) NOT NULL UNIQUE,
	"description" text,
	"image_url" varchar(2048),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL,
	"deleted_at" integer
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" varchar(255) PRIMARY KEY,
	"product_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"options" json DEFAULT '{}' NOT NULL,
	"price_override" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar(255) PRIMARY KEY,
	"name" varchar(500) NOT NULL,
	"slug" varchar(500) NOT NULL UNIQUE,
	"tagline" varchar(500),
	"description" text,
	"price" integer NOT NULL,
	"discount" integer,
	"image_url" varchar(2048) NOT NULL,
	"images" json DEFAULT '[]' NOT NULL,
	"collection_ids" json,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL,
	"deleted_at" integer
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" varchar(255) PRIMARY KEY,
	"name" varchar(255) NOT NULL,
	"color" varchar(50) NOT NULL,
	"description" text,
	"updated_at" integer NOT NULL,
	"deleted_at" integer
);
--> statement-breakpoint
CREATE TABLE "todo_list_items" (
	"id" varchar(255) PRIMARY KEY,
	"text" varchar(1000) NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"status" varchar(50) NOT NULL,
	"priority" varchar(50),
	"order" integer DEFAULT 0 NOT NULL,
	"list_id" varchar(255) NOT NULL,
	"user_id" varchar(255),
	"updated_at" integer NOT NULL,
	"created_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(255) PRIMARY KEY,
	"email" varchar(255) NOT NULL UNIQUE,
	"name" varchar(255) NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" varchar(2048),
	"role" "role" DEFAULT 'user'::"role" NOT NULL,
	"is_test_user" boolean DEFAULT false NOT NULL,
	"updated_at" integer NOT NULL,
	"deleted_at" integer
);
