## Migrations

### Two-Part System

#### 1. Drizzle-Kit CLI (manual)

Use Drizzle-Kit locally to generate migration files from schema changes.

```bash
# 1. Modify schema in packages/db/src/schema/

# 2. Generate a migration file
pnpm --filter @urm/db exec drizzle-kit generate --dialect postgresql --schema ./src/schema/index.ts --out ./src/migrations --name describe_change

# 3. Apply pending migrations with the migrator you use for the target environment
```

The explicit `--out` argument writes migration files to `packages/db/src/migrations/`.

#### 2. Drizzle Runtime Migrator (automatic)

The Effect migrator applies existing migration files.

Startup flow:

1. Generate migration files from schema changes
2. Run `migrator()` through the normal migrator entrypoint for that environment
3. `MigratorEnvironmentLive` calls `migrate()` from `drizzle-orm`
4. Drizzle reads migration files from `packages/db/src/migrations/`
5. Drizzle applies only pending migrations to the current database

The runtime migrator does not generate migrations.
It only applies migration files that already exist.

#### Recommended Workflow

1. Change schema and run `drizzle-kit generate` to create a migration file.
2. Apply pending migrations with the same migrator flow in dev/stage/prod.
3. Preserve applied migrations and generate additive migrations for subsequent changes.
