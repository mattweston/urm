

```sh
# our next content deploy will rename the slot while the old name sits in patroni.slots — which is precisely the stale-entry case. So run this straight after that deploy, before anything else:
pscale sql urm dev --role admin --format json --query "SELECT slot_name, active, wal_status, restart_lsn::text FROM pg_replication_slots ORDER BY slot_name"
```

```sh
# Adding a synced table: the whole sequence. postgres/README.md -> "Adding a
# synced table, end to end" has the five files it edits and why the order
# matters. Steps 1-8 are code; these are the commands.
# 1. A throwaway migrated SQLite, which the sync-rules generator needs.
#    Never the application's own database: opening that applies the migration
#    as a side effect.
#    PRAGMA foreign_keys = ON is the whole trick -- without it migration 0026's
#    ALTER TABLE RENAME leaves entity_tags.tag_id pointing at tags_new.
{ echo "PRAGMA foreign_keys = ON;"; cat migrations/*.sql; } | sqlite3 /tmp/schema.sqlite3
```

```sh
# Check the pragma did its job: this must name `tags`, not `tags_new`.
sqlite3 /tmp/schema.sqlite3 "PRAGMA foreign_key_list(entity_tags);"
```

```sh
# 2. Regenerate the sync streams. Generated, never hand-written: the rules name
#    every synced table and are the only thing keeping one tenant's rows off
#    another tenant's devices.
python3 -I postgres/sync_rules.py /tmp/schema.sqlite3 > powersync/sync-config.yaml
```

```sh
# 3. Diff before trusting it. A table with a domain_id or organization_id is
#    classified automatically, so the only change should be the new query and
#    two counts. Anything else moving means the throwaway schema is wrong.
git diff powersync/sync-config.yaml
```

```sh
# 4. Apply the DDL, as an owner. pg_write_all_data grants INSERT/UPDATE/DELETE
#    and no DDL, which belongs to the table's owner.
#    Then: \i postgres/apply_00NN_to_an_existing_branch.sql
pscale shell urm dev --role admin
```

```sh
# 5. Then deploy the sync config -- this order, not the other. Rules that name a
#    table the branch does not have is the one failure that is silent.
powersync deploy sync-config
```

```sh
# 6. Then the slot, both halves. A deploy whose content changed creates a new
#    slot, which loses `failover` AND leaves the old name in patroni.slots.
#    This fixes the flag and reports the registration.
just slot-failover urm dev
```

```sh
# 7. Register the new slot name. A cluster-parameter change, so it is not
#    automated: without it the flag alone does not survive a switchover.
#    Replace the list, never append -- a stale name may make Patroni recreate a
#    slot with no consumer, retaining WAL without bound.
pscale branch resize urm dev --parameters patroni.slots=<new-slot-name>
```

```sh
# 8. Prove the client and server schemas still agree: every column, type,
#    default, key, foreign key and index.
python3 -I postgres/compare.py /tmp/schema.sqlite3
```

```sh
# Where a branch stands, any time. Needs no credential: --role admin mints
# ephemeral ones. failover and a registered name are both required; restart_lsn
# advancing is how you tell a healthy slot from one that survived but stalled.
pscale sql urm dev --role admin --format json --query "SELECT slot_name, failover, active, wal_status, restart_lsn::text FROM pg_replication_slots ORDER BY slot_name"
```

```sh
# The registration half, read back. 'Logical slot name' in the dashboard.
pscale branch parameters urm dev --namespace patroni
```

```sh
# Adding a *column* is none of the above: the generated rules are SELECT *, so
# it changes no rule, makes no slot and costs no client a re-sync. Migration,
# tables.sql, and done.
cargo test -p urm-db
```

```sh
# --- Reading a branch, no credential needed -------------------------------
# `--role admin` mints ephemeral credentials, so every read below is safe to
# run from anywhere and leaves no password on disk. Prefer these over psql.
pscale auth check --format json
```

```sh
# Which roles exist and which one can replicate. REPLICATION is a role
# *attribute*, settable only at creation -- `pscale role update` changes a
# role's name and nothing else, so a role created without it must be replaced.
pscale role list urm dev --format json
```

```sh
# Every cluster parameter, current and default. Values from a queued change
# request are reflected. The Failover section is patroni.*; Postgres is pgconf.*
pscale branch parameters urm dev
```

```sh
# The four things a slot needs to survive a switchover, in two queries.
# One: the slot's own flag and health.
pscale sql urm dev --role admin --format json --query "SELECT slot_name, failover, active, wal_status, invalidation_reason, restart_lsn::text FROM pg_replication_slots ORDER BY slot_name"
```

```sh
# Two: the cluster's half. sync_replication_slots copies the slot to the
# standby; hot_standby_feedback stops vacuum invalidating the copy.
# synchronized_standby_slots is a different guarantee and is correctly empty.
pscale sql urm dev --role admin --format json --query "SELECT name, setting FROM pg_settings WHERE name IN ('sync_replication_slots','hot_standby_feedback','synchronized_standby_slots','max_slot_wal_keep_size','wal_level','idle_replication_slot_timeout') ORDER BY name"
```

```sh
# Is the publication complete? Reapplying a schema drops every table OUT of the
# publication while leaving the publication in place -- a service that starts
# normally, a slot that reports itself caught up, and no data that ever reaches
# a client. Want the same number as engine::schema::SYNCED.
pscale sql urm dev --role admin --format json --query "SELECT count(*) AS published FROM pg_publication_tables WHERE pubname = 'powersync'"
```

```sh
# Which synced tables are missing from the publication, by name.
pscale sql urm dev --role admin --format json --query "SELECT t.table_name FROM information_schema.tables t WHERE t.table_schema='public' AND t.table_name NOT IN (SELECT tablename FROM pg_publication_tables WHERE pubname='powersync') ORDER BY 1"
```

```sh
# Read-only diagnostics against the branch, same ephemeral credentials.
pscale inspect urm dev
```

```sh
# An interactive shell as the owner, for DDL. pg_write_all_data grants
# INSERT/UPDATE/DELETE and no DDL, which belongs to the table's owner.
pscale shell urm dev --role admin
```

```sh
# --- Changing a branch: each of these needs asking first ------------------
# Cluster parameters. A queued change request, applied asynchronously; add
# --wait to block. `restart` in `pscale branch parameters` says whether a
# parameter forces one.
pscale branch resize urm dev --parameters patroni.slots=<slot-name>
```

```sh
# What the last change request did, or is doing.
pscale branch resize status urm dev
```

```sh
# Roles are created with their attributes and PlanetScale shows the password
# ONCE. Save it then or it has to be rotated.
pscale role create urm dev powersync-replication --inherited-roles postgres --with-replication
```

```sh
# --- PowerSync -----------------------------------------------------------
# Deploy the generated sync streams. A deploy of identical content is free:
# re-running it leaves the slot untouched, and only differing content makes a
# new one. So this is safe to run speculatively.
powersync deploy sync-config
```

```sh
# Which instance the CLI is pointed at, before any mutating command.
powersync fetch instances
```

```sh
# Pull the cloud's own config. Writes service-fetched.yaml / sync-fetched.yaml
# rather than clobbering ours. NOT a way to recover the replication password --
# PowerSync redacts it. Delete the fetched files afterwards; they are gitignored.
powersync pull instance --instance-id=<id>
```

```sh
# --- The replication credential ------------------------------------------
# slot_failover.py wants URM_POSTGRES_REPLICATION: the DIRECT endpoint (5432,
# not the 6432 pooler) as powersync-replication, keeping sslrootcert=system and
# WITHOUT replication=database, which the script appends.
# postgres/.env.schema is its varlock root -- deliberately not apps/auth/'s, so
# the internet-facing service never inherits a replication credential.
varlock run --path postgres/ --inject vars -- python3 -I postgres/slot_failover.py urm dev
```

```sh
# Or from the shell, without putting it on disk. Two traps, both cost an hour:
# psql reads any string not starting postgres:// as key=value conninfo and
# reports `invalid connection option "<first token>"`; and varlock resolves
# process.env AHEAD of .env.local, so a stale export silently wins.
unset URM_POSTGRES_REPLICATION
```

```sh
# Paste at the prompt -- `read -rs` echoes nothing, so verify before using it.
read -rs URM_POSTGRES_REPLICATION && export URM_POSTGRES_REPLICATION && case "$URM_POSTGRES_REPLICATION" in postgres*://*) echo "ok: URI, ${#URM_POSTGRES_REPLICATION} chars" ;; *) echo "not a URI -- paste again" ;; esac
```

```sh
# --- A device, and the order that matters --------------------------------
# Adopt BEFORE exporting. A device mints its own organization and user at first
# open; exporting first stamps Postgres with ids the sync rules will never
# match. Run with the application closed, --dry-run first.
urm adopt-workspace --dry-run
```

```sh
# Then put the device's rows on the server. Mandatory before sync is ever
# turned on: rows that miss the export predate the CRUD triggers, so they can
# never be uploaded and are invisible to the server for ever, silently.
# It refuses a target that already holds rows, and verifies every table's count.
python3 -I postgres/export.py ~/Library/Application\ Support/com.urm.app/urm.db "$URM_POSTGRES_DIRECT"
```

```sh
# --- The local database --------------------------------------------------
# Which migration a device is on.
sqlite3 "file:$HOME/Library/Application Support/com.urm.app/urm.db?mode=ro" "SELECT max(version) FROM _migrations;"
```

```sh
# Writes this device sent that the server refused. Server-written and synced
# back, so a refusal arrives through the database like any other row.
sqlite3 "file:$HOME/Library/Application Support/com.urm.app/urm.db?mode=ro" "SELECT table_name, operation, reason, occurred_at FROM sync_rejections ORDER BY occurred_at DESC LIMIT 20;"
```

```sh
# --- A fresh database, from nothing --------------------------------------
# Once, in order, against an empty database. There is no ledger and no down
# path here: before production a change is DROP DATABASE and reapply.
psql "$URM_POSTGRES_DIRECT" -v ON_ERROR_STOP=1 -f postgres/tables.sql
```

```sh
# Then their 154 indexes. Same order as tables.sql, parents first.
psql "$URM_POSTGRES_DIRECT" -v ON_ERROR_STOP=1 -f postgres/indexes.sql
```

```sh
# Re-running this is PART of reapplying a schema, not an optional extra: it
# drops and recreates the publication, which a DROP SCHEMA empties silently.
psql "$URM_POSTGRES_DIRECT" -v ON_ERROR_STOP=1 -f postgres/powersync.sql
```

```sh
# Local cluster only: PlanetScale creates these itself and refuses to let SQL
# create a REPLICATION role. Keep both passwords as they are generated.
psql "$URM_POSTGRES_DIRECT" -v ON_ERROR_STOP=1 -v powersync_password="'$(openssl rand -base64 24)'" -v app_password="'$(openssl rand -base64 24)'" -f postgres/local_roles.sql
```

```sh
# --- Verification --------------------------------------------------------
# The four checks, as one recipe. Capture the code directly rather than through
# a pipe, which loses it.
just ci > /tmp/ci.log 2>&1; echo "exit=$?"
```

```sh
# A migrated screen reports nothing here. An unmigrated one shows its worklist.
just ui-lint
```

```sh
# Run the bundled application with its icon, output still in this terminal.
# It holds the database lock, so quit it before anything that opens the db.
just dev-desktop-bundled
```
