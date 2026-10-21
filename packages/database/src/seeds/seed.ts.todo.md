/\*\*

- Database seed script for URM
-
- Idempotent seed that:
-   1. Creates admin users from ADMIN_USER_IDS environment variable
-   2. Creates test users with different roles (user, member, admin)
-   3. Can be run multiple times safely without duplicate errors
-
- Usage:
- ADMIN_USER_IDS=id1,id2 bunx ts-node apps/server/src/db/seeds/seed.ts
-
- @packageDocumentation
  \*/

import { Effect } from "effect";
import { DB } from "../layer.js";
import { schema } from "../layer.js";
import { eq } from "drizzle-orm";
import { faker } from "@faker-js/faker";

const { users } = schema;

/\*\*

- Get admin user IDs from environment variable
- Format: comma-separated user IDs
  \*/
  function getAdminIdsFromEnv(): string[] {
  const adminIds = process.env.ADMIN_USER_IDS || "";
  return adminIds
  .split(",")
  .map((id) => id.trim())
  .filter((id) => id.length > 0);
  }

/\*\*

- Upsert admin user - idempotent
- If user exists, update role to admin
- If not, create new admin user
  _/
  const upsertAdminUser = (db: any, userId: string): Effect.Effect<void> =>
  Effect.gen(function_ () {
  const existing = yield\* Effect.tryPromise({
  try: () =>
  db
  .select()
  .from(users)
  .where(eq(users.id, userId))
  .limit(1)
  .then((rows: unknown[]) => rows[0] || null),
  catch: (error) => error,
  });

        if (existing) {
          // User exists - check if role needs updating
          if (existing.role !== "admin") {
            yield* Effect.tryPromise({
              try: () =>
                db.update(users).set({ role: "admin" }).where(eq(users.id, userId)),
              catch: (error) => error,
            });
            console.log(`✓ Updated user ${userId} to admin role`);
          } else {
            console.log(`✓ User ${userId} already has admin role`);
          }
        } else {
          // Create new admin user
          yield* Effect.tryPromise({
            try: () =>
              db.insert(users).values({
                id: userId,
                email: `admin_${userId.slice(0, 8)}@admin.local`,
                name: `Admin ${userId.slice(0, 8)}`,
                role: "admin",
                email_verified: true, // CLI bypass
                is_test_user: false,
                updated_at: new Date().getTime(),
                deleted_at: null,
              }),
            catch: (error) => error,
          });
          console.log(`✓ Created admin user ${userId}`);
        }

    });

/\*\*

- Create test user with specific role
- Uses faker to generate realistic test data
- Idempotent - checks for existing email before creating
  _/
  const createTestUser = (
  db: any,
  role: "user" | "member" | "admin",
  \_index: number,
  ): Effect.Effect<void> =>
  Effect.gen(function_ () {
  // Generate unique email for test user
  const timestamp = Date.now();
  const email = `faker_${role}_${timestamp}@test.local`;

        // Check if similar user already exists
        const existing = yield* Effect.tryPromise({
          try: () =>
            db
              .select()
              .from(users)
              .where(eq(users.email, email))
              .limit(1)
              .then((rows: unknown[]) => rows[0] || null),
          catch: (error) => error,
        });

        if (!existing) {
          // Create test user
          yield* Effect.tryPromise({
            try: () =>
              db.insert(users).values({
                id: crypto.randomUUID(),
                email,
                name: faker.person.fullName(),
                image: faker.image.avatar(),
                role,
                email_verified: false, // Will be added in later phases
                is_test_user: true, // Mark as test user
                updated_at: new Date().getTime(),
                deleted_at: null,
              }),
            catch: (error) => error,
          });
          console.log(`✓ Created test user ${email} with role ${role}`);
        }

    });

/\*\*

- Main seed function
- Runs all seeding operations idempotently
  _/
  const runSeed = Effect.gen(function_ () {
  const db = yield\* DB;

console.log("🌱 Starting database seed...\n");

// Step 1: Create admin users from environment
console.log("📌 Processing admin users from ADMIN_USER_IDS...");
const adminIds = getAdminIdsFromEnv();
if (adminIds.length > 0) {
for (const id of adminIds) {
yield\* upsertAdminUser(db, id);
}
console.log();
} else {
console.log("ℹ️ No ADMIN_USER_IDS provided\n");
}

// Step 2: Create test users with different roles
console.log("🧪 Creating test users...");
yield* createTestUser(db, "user", 0);
yield* createTestUser(db, "member", 1);
yield\* createTestUser(db, "admin", 2);

console.log("\n✅ Seed script completed successfully!");
});

/\*\*

- Execute seed script
- Provides DB layer and runs effect
  \*/
  const main = runSeed.pipe(
  Effect.provideServiceEffect(
  DB,
  Effect.sync(() => {
  // Import DB layer at runtime to avoid circular dependencies
  const { DatabaseLive } = require("../layer.js");
  return DatabaseLive;
  }),
  ),
  Effect.catch((error) => {
  console.error("❌ Seed script failed:", error);
  process.exit(1);
  }),
  );

// Run the seed script
// Using Promise to handle async execution
Effect.runPromise(main).catch((error) => {
console.error("❌ Unhandled error:", error);
process.exit(1);
});
