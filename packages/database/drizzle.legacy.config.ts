import { defineConfig } from "drizzle-kit"

export default defineConfig({
    dialect: "postgresql",
    schema: "./src/legacy-schema/index.ts",
    out: "./src/migrations",
    migrations: {
        schema: "public",
        table: "__drizzle_migrations",
    },
})
