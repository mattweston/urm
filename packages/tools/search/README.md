# Local Grep baseline

Run from the repository root:

```sh
node --import tsx packages/tools/search/run-baseline.ts
node --import tsx packages/tools/search/run-baseline.ts packages/domain/src packages/domain/test
pnpm exec tsc -p packages/tools/search/tsconfig.json
node --import tsx --test packages/tools/search/baseline.test.ts
```

The default roots are defined in `baseline.ts`. Explicit positional roots replace
the defaults, allowing a separate package or upstream run. Missing roots fail
explicitly. Real environment files are never opened. Only exact `.env.example` and
`env.example` templates are eligible; keep their values as placeholders. This is a local benchmark tool,
not a browser module or a running search service.

Each run creates a private temporary `urm-grep-*` directory containing captured
text, a SHA-256 manifest and a benchmark report. Its path is printed at completion.
Source text stays outside the repository. Captured files are read-only; keep the
temporary directory local. The tool does not publish, upload or delete snapshots.

The manifest records included paths, bytes, hashes, origin and a coarse content
kind, plus excluded paths and reasons. It excludes symlinks, environment and
credential filenames, known generated directories, declaration/minified files,
saved reference artifacts, invalid UTF-8, NUL-containing binary content, private
key markers and generated markers in the first 1,024 characters. These heuristics
need curation before broader ingestion; they do not certify absence of secrets
or generated material. Markdown kinds are coarse until association extraction
adds documentation/plan/skill provenance.

Source hashes are checked again before completing capture. This detects changed
or deleted captured files, but is not a filesystem-wide atomic snapshot. Changes
after verification cannot change the captured text. Run against a quiescent
checkout for reproducible corpus membership; a filesystem snapshot or repository
archive is needed for stronger capture guarantees.

Every query runs against captured text with literal, case-sensitive ripgrep JSON
output. An independent byte matcher verifies every file's occurrence count and
digest of byte offsets, line numbers and UTF-16 columns. Empty input is a no-op;
CR/LF, NUL, malformed Unicode and queries exceeding 1,024 codepoints are rejected.
No normalization is performed. Matches do not overlap.

Reports contain first-result and complete-search timings for a first and repeated
pass. OS caches are not cleared. Timings include child-process startup, JSON
parsing and occurrence-digest construction; they exclude the independent matcher
and initial capture. Memory is the Node process's end-of-run sample, not peak
memory or ripgrep memory. Counts are exact only after complete verification.

`collect_corpus` provides the same exclusions and verified in-memory snapshot to
the development Grep module; `capture` additionally writes the benchmark snapshot.
The UI in `packages/features/src/dev/grep/` currently searches only domain source
and domain documentation. It has progressive display controls, but no full-corpus
search transport, index engine or hosted publication.
