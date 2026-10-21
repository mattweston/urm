```ts
import { Effect } from "effect";
import { DB } from "../services/database-service.ts";
import fs from "node:fs";
import path from "node:path";

const seed = Effect.gen(function* () {
  const db = yield* DB;
  const contentDir = path.join(import.meta.dirname, "content");
  const files = fs.readdirSync(contentDir).filter(f => f.endsWith(".md"));

  for (const file of files) {
    const slug = path.basename(file, ".md");
    const body = fs.readFileSync(path.join(contentDir, file), "utf-8");
    yield* Effect.tryPromise(() =>
      db.insert(ideas).values({ slug, body })
        .onConflictDoUpdate({ target: /* slug column */, set: { body } })
    );
  }
});
```
