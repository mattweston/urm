/**
 * # Environment loader
 *
 * Must run before any other imports: ensures `process.env` is populated
 * before the db layer accesses `DATABASE_URL`.
 */
import dotenv from "dotenv"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, "../../..")
const envPath = join(rootDir, ".env.local")

dotenv.config({ path: envPath })
