import assert from "node:assert/strict"
import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import { test } from "node:test"
import {
    benchmark,
    capture,
    collect_corpus,
    literal_matches,
    validate_query,
} from "./baseline.ts"

test("literal positions preserve UTF-8 offsets, UTF-16 columns and CRLF", () => {
    assert.deepEqual(
        [...literal_matches(Buffer.from("😀aa\r\néaa aaa"), "aa")],
        [
            { start: 4, end: 6, line: 1, column: 3 },
            { start: 10, end: 12, line: 2, column: 2 },
            { start: 13, end: 15, line: 2, column: 5 },
        ]
    )
    assert.deepEqual(
        [...literal_matches(Buffer.from("é é Ａ A"), "A")],
        [{ start: 11, end: 12, line: 1, column: 8 }]
    )
    assert.deepEqual([...literal_matches(Buffer.from("anything"), "")], [])
    for (const query of ["\n", "\r", "\0", "x".repeat(1025), "\ud800"])
        assert.throws(() => validate_query(query))
    validate_query("😀".repeat(1024))
})

test("capture excludes sensitive paths and rg matches captured text after source edits", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "urm-grep-fixture-"))
    await mkdir(resolve(root, "src"))
    await mkdir(resolve(root, "src/_generated"))
    await writeFile(
        resolve(root, "src/a.ts"),
        "😀aa\r\néaa aaa\nＡ A\n--flag\n" + "x".repeat(2048)
    )
    await writeFile(resolve(root, "src/.env"), "excluded")
    await writeFile(
        resolve(root, "src/private-key.ts"),
        "-----BEGIN PRIVATE KEY-----"
    )
    await writeFile(resolve(root, "src/invalid.ts"), Buffer.from([255]))
    await writeFile(resolve(root, "src/binary.ts"), Buffer.from([0]))
    await writeFile(resolve(root, "src/_generated/a.ts"), "excluded")
    await symlink(resolve(root, "src/a.ts"), resolve(root, "src/link.ts"))
    const snapshot = await capture(root, ["src"])
    assert.deepEqual(
        snapshot.manifest.entries.map((entry) => entry.path),
        ["src/a.ts"]
    )
    assert.equal(snapshot.manifest.skipped.length, 6)
    const repeated = await capture(root, ["src"])
    assert.equal(repeated.manifest.snapshot, snapshot.manifest.snapshot)
    await writeFile(resolve(root, "src/a.ts"), "changed")
    for (const query of [
        "aa",
        "A",
        "--flag",
        " ",
        "not present",
        "x".repeat(1024),
        "😀",
    ])
        await benchmark(snapshot, query)
    assert.equal((await benchmark(snapshot, "aa")).occurrences, 3)
    assert.equal((await benchmark(snapshot, "changed")).occurrences, 0)
    await assert.rejects(capture(root, ["../escape"]))
})

test("only exact environment examples are eligible, including through explicit roots", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "urm-grep-policy-"))
    await mkdir(resolve(root, "src"))
    const excluded = [
        ".env",
        ".env.local",
        ".env.production",
        ".env.example.local",
        "env.local",
        "env.example.backup",
        ".envrc",
        "credentials.ts",
        "secrets.md",
        "id_ed25519",
        "certificate.pem",
        "private.key",
    ]
    for (const name of excluded)
        await writeFile(resolve(root, "src", name), "excluded fixture")
    for (const name of [".env.example", "env.example"])
        await writeFile(
            resolve(root, "src", name),
            "API_KEY=your_placeholder_here"
        )
    await mkdir(resolve(root, "src/secrets"))
    await writeFile(
        resolve(root, "src/secrets/ordinary.ts"),
        "excluded fixture"
    )
    await symlink(resolve(root, "src/.env"), resolve(root, "src/example.ts"))
    const corpus = await collect_corpus(root, ["src"])
    assert.deepEqual(
        [...corpus.contents.keys()],
        ["src/.env.example", "src/env.example"]
    )
    for (const name of excluded)
        await assert.rejects(collect_corpus(root, [`src/${name}`]))
    await assert.rejects(collect_corpus(root, ["src/secrets/ordinary.ts"]))
    await assert.rejects(collect_corpus(root, ["src/example.ts"]))
    assert.equal(
        (await collect_corpus(root, ["src/.env.example"])).contents.size,
        1
    )
})
