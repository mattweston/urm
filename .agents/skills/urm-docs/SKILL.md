---
name: urm-docs
description: Create and maintain URM docs/ pages and concise, evidence-backed JSDoc that helps Grep readers and coding agents understand and change exported behavior. Also supports research notes when requested.
---

# URM Docs

Maintain URM-specific documentation from current source and tests. Put exported
contracts beside code in JSDoc, and workflows and cross-module explanations in
`docs/`. When the user asks for research notes, preserve findings in
`docs/llm-notes/` instead of drafting finished documentation.

## Scope

- For documentation requests, edit source comments and relevant `docs/` pages.
- When invoked during implementation, review newly created or edited exports
  and affected workflows before handoff. Update stale documentation and add
  missing explanations where contracts or behavior need them. A private helper,
  formatting change or unchanged contract does not need a new page or comment.
- For research-only requests, use the working-note mode below; do not silently
  turn an investigation into documentation or implementation changes.
- Keep changes within the requested topic or implementation. Source-comment
  edits are in scope for documentation; runtime changes require implementation
  authorization. Record discovered bugs without silently fixing them.
- Do not register routes, create teaching widgets or publish anything.
- Follow the root architecture-note requirement when making architectural
  decisions; routine documentation maintenance needs no architecture note.
- Follow the repository's root `AGENTS.md`, including the ban on reading `.env` files and using `bun`, `git`, or `rm`.

## Documentation placement

Read `LLMS.md` and `docs/README.md`, then inspect the relevant source and tests.
Prefer an existing page or comment over creating a competing explanation.

- **JSDoc:** purpose, validation constraints, inputs/outputs, errors, required
  services, side effects and meaningful edge cases of an exported declaration.
- **`docs/`:** URM workflows, lifecycle, ownership, relationships between modules,
  rationale and troubleshooting. Explain how symbols fit together without
  repeating their complete contracts or implementations.
- **`llm-docs/src/`:** curated type-checked patterns for `LLMS.md`. Update only
  when the task changes those shared patterns; it is not an API reference dump.
- **Working notes:** evidence, uncertainty and documentation ideas when research
  is the requested deliverable.

## Source JSDoc

Place `/** ... */` immediately above the exported declaration it documents.
For a schema with a same-name type, document the schema once.

Write for two reading contexts: a Grep result that needs a short explanation
of the symbol, and an agent editing the adjacent implementation. Lead with the
symbol's role in URM, then explain the behavior a caller or editor could miss.
Prefer a short paragraph for simple exports; use more space when a complex
contract warrants it. Coverage and comment counts are not quality targets.

- Keep facts that affect a decision: validation versus normalization, defaults,
  compatibility behavior, invariants to preserve, side effects, error handling,
  and prerequisites supplied by the caller. Distinguish synchronous throws
  from typed Effect failures when relevant.
- Omit field inventories, obvious type descriptions and mechanical limit
  lists. Keep an exact limit when it explains a meaningful boundary, such as
  encoded bytes versus characters, or makes a standalone result useful.
- Describe missing guarantees only when readers could reasonably assume them.
  Do not append generic authorization, persistence or sanitization disclaimers
  to every schema. Likewise, do not describe every operation as service-free.
- Name the related symbol when it tells readers what to use next, such as
  validate_columns after DataColumns. Avoid keyword stuffing and redundant
  symbol-name headings; Grep already supplies titles and aliases. Prose
  mentions do not create documentation search aliases.
- Add a small fenced `ts` example only when it clarifies non-obvious usage.
  Do not repeat the implementation or add instructions addressed to agents
  inside API comments; documentation describes code, not agent policy.

For example, prefer “Contact read model. Email and telephone remain plain
strings so older records still load; use Email and PhoneNumber at write
boundaries” over a field-by-field description of Contact's schema.

Before handoff, read each changed comment alongside its implementation and
relevant tests. Ask what useful decision each sentence supports; trim sentences
that add none. Update or remove stale claims in the same change as the behavior
they describe. When comments disagree with code or tests, investigate the
discrepancy rather than treating prose as authority or inventing intended
behavior. Keep unsettled proposals in notes, not in an API contract.

Grep extracts comments directly through `apps/client/grep-api-docs.server.ts`;
no docgen dependency or generated Markdown tree is needed. Check
`apps/client/grep-search.server.ts` for current ingestion coverage. URM extraction
currently includes `.ts` files in `packages/domain/src`, `packages/features/src`
and `apps/client/src`, excluding `internal/` files and `@internal` comments.
It reads directly exported declarations, not re-export statements. Do not
promise Grep visibility for other roots or add runtime exports merely to index
a comment. Document unindexed source when useful and report that limitation.

The extractor supplies symbol/module aliases and source positions. Use standard
Markdown in JSDoc: paragraphs, inline code, fenced examples, lists and links.
Do not use `:::` directives such as Callout, Tabs or Steps in source comments;
editor hover tooltips may display that syntax literally. Reserve those directives
for `docs/` pages. Extraction is not a full JSDoc renderer or an example checker.
Do not invent `@since` versions or custom search tags.

## Markdown pages

Follow `docs/README.md` for frontmatter, links and supported directives. Use
descriptive titles and headings, exact symbol aliases where appropriate, and a
repository-relative `source` for a page about one module. `source_regions` keys
must match H1/H2 headings and refer to real named regions in that source file.
Do not invent source line ranges or regions.

In `docs/`, use `:::Callout` sparingly for a consequential warning or an easily
missed constraint. Prefer ordinary prose for routine explanations; do not wrap
every note or section in a callout. Follow `docs/README.md` for supported tones
and directive syntax.

Grep matches topic names, headings and aliases rather than arbitrary prose
mentions. Choose those deliberately. Link related indexed pages with relative
Markdown links, and keep upstream reference material in the vendored corpus.
When moving a contract into JSDoc, preserve the page's useful workflow explanation
and navigation instead of maintaining two independent copies of the contract.
Migrate incrementally within the task; avoid unrelated documentation rewrites.

## Research

Read `LLMS.md` first, then inspect the smallest set of source, tests, docs, patterns, and vendored context needed to answer the question. Prefer the running code and tests over prose when describing what URM currently does.

Keep these categories distinct:

- **Observed:** directly supported by current repository files or command output.
- **Inferred:** a conclusion drawn from multiple observations. State that it is an inference.
- **Proposed:** a possible documentation framing or future change. Never present it as current behavior.

Re-run queries rather than copying old counts. Record the exact command behind every count or generated list, along with the verification date. Never estimate a repository fact that can be measured.

## Working-note mode

For a new note, find the highest numeric prefix already in `docs/llm-notes/` and add one globally:

```text
docs/llm-notes/NNNN-dash-case-topic.md
```

Existing duplicate prefixes are historical; do not renumber them. If a note already covers the requested topic, update that note instead of creating a second one. Preserve useful existing material and correct stale claims in place.

Use plain Markdown. Frontmatter is optional because this directory is not part of the docs content collection. Prefer the following shape, omitting empty sections:

```markdown
# Topic

Verified: YYYY-MM-DD

## Summary

## Findings

## Repository evidence

## Issues and TODO candidates

## Documentation angles

## Open questions

## Reproduction
```

Write for a future documentation author:

- Lead with the model or boundary that makes the surrounding code understandable.
- Include exact package paths, source paths, exported symbols, and relevant tests.
- Quote code only when its exact spelling matters; otherwise summarize it.
- Capture contradictions, legacy paths, edge cases, and uncertainty rather than smoothing them away.
- Actively look for broken invariants, stale docs, unused dependencies, missing tests, boundary leaks, confusing names, duplicated behavior, and TODOs already present in the relevant code.
- Record each confirmed issue with its impact and evidence. Put suggested work under **TODO candidates** and distinguish a necessary fix from an optional improvement.
- Do not silently fix issues discovered during research; note them unless the user separately authorizes implementation.
- Put possible outlines, examples, diagrams, and cross-links under **Documentation angles**, not among observed facts.
- Link related notes with relative Markdown links when that helps later synthesis.
- Do not add quizzes, exercises, missions, learning records, or `/learn/` links.

## Finish

After edits, run the smallest relevant check once, following root `AGENTS.md`.
Source-comment edits normally need only the affected package typecheck, not new
runtime tests. Changes to Grep ingestion need a focused ingestion/search test.
Examples in JSDoc are not checked by extraction; verify executable examples
through an appropriate existing check when adding them, or disclose that they
were not checked.

After `docs/` edits, run `pnpm docgen:llm` and `pnpm docs:lint` as required by
the repository instructions. The root Markdown corpus has no standalone
TypeScript typecheck. A Markdown-only working note under `docs/llm-notes/`
remains non-canonical research and does not require the canonical docs checks.

Tell the user which documentation or notes changed, what they explain, and
which checks passed, were skipped or could not run. Mention any Grep coverage
limitations relevant to the changed files.
