import { writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { benchmark, capture, local_roots } from "./baseline.ts"

const roots = process.argv.slice(2)
const started = performance.now()
const snapshot = await capture(
    process.cwd(),
    roots.length > 0 ? roots : local_roots
)
const capture_ms = performance.now() - started
const measurements = []
for (const query of [
    "Schema.Struct",
    "Effect.orDie",
    "Struct",
    ".",
    "=>",
    " ",
    "URM_GREP_ABSENT_6c7d927e",
]) {
    for (const pass of ["first", "repeat"]) {
        const result = await benchmark(snapshot, query)
        measurements.push({ pass, ...result })
        console.log(JSON.stringify({ pass, ...result }))
    }
}
const report = {
    snapshot: snapshot.manifest.snapshot,
    files: snapshot.manifest.entries.length,
    bytes: snapshot.manifest.entries.reduce(
        (total, entry) => total + entry.bytes,
        0
    ),
    skipped: snapshot.manifest.skipped.length,
    capture_ms,
    memory: process.memoryUsage(),
    measurements,
}
await writeFile(
    resolve(snapshot.directory, "benchmark.json"),
    JSON.stringify(report, null, 4),
    { mode: 0o600 }
)
console.log(JSON.stringify({ directory: snapshot.directory, ...report }))
