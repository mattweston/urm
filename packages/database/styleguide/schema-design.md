---
title: "Schema Design"
---

# Schema Design

- [[/styleguide/schema|Schema]]

[Schema Design - Open Faith](https://github.com/FaithBase-AI/openfaith/blob/master/docs/SchemaDesign.md)

```sql
-- ## Primary Keys

-- Prefer `BIGINT GENERATED ALWAYS AS IDENTITY`. Avoid random UUIDs (UUIDv4) as primary keys; use `uuidv7()` when you need UUIDs.

-- `user` is a reserved keyword in PostgreSQL (use "")
create table "user" (
    id bigint generated always as identity primary key,
    email text not null unique
);
-- Random UUID PKs (v4) can cause index fragmentation; UUIDs are also larger (16 vs 8 bytes for BIGINT) and can slow joins.

-- ## Data Types

-- | Use | Avoid |
-- | --- | --- |
-- | `TEXT`, `VARCHAR` | Extension-specific types |
-- | `JSONB` | Custom ENUMs (use CHECK instead) |
-- | `TIMESTAMPTZ` | `TIMESTAMP` without time zone |
-- | `BIGINT`, `INTEGER` | Platform-specific types |

-- Prefer `CHECK` constraints over ENUM types — they're easier to modify:

-- `order` is a reserved keyword in PostgreSQL (use "")
create table "order" (
    id bigint generated always as identity primary key,
    status text not null check (status in ('pending', 'shipped', 'delivered'))
);

-- ## Foreign Keys

-- * Always index FK columns (PostgreSQL does not auto-create these)
-- * Avoid circular FK dependencies

-- * Suggestion: use `ON DELETE CASCADE` or `ON DELETE SET NULL` explicitly
create table "order" (
    id bigint generated always as identity primary key,
    customer_id bigint not null references customer(id) on delete cascade
);
create index order_customer_id_idx on "order" (customer_id);

-- ## Naming Conventions

-- * Tables: singular snake_case (`user_account`, `order_item`)
-- * Columns: singular snake_case (`created_at`, `user_id`)
-- * Indexes: `{table}_{column}_idx`
-- * Constraints: `{table}_{column}_{type}` (e.g., `order_status_check`)

-- ## General Guidelines

-- * Add `NOT NULL` to as many columns as possible
-- * Add `created_at TIMESTAMPTZ DEFAULT NOW()` to all tables
-- * Use `BIGINT` for all IDs and foreign keys, even on small tables
-- * Keep tables normalized; denormalize only for proven hot read paths
```
