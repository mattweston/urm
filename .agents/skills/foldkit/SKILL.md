---
name: foldkit
description: Use whenever working with Foldkit. Triggers on imports from `foldkit`, files in a Foldkit project, or prompts mentioning Foldkit. Loads the framing and points at the vendored Foldkit subtree for canonical conventions, source code, examples, and audits.
---

# Foldkit

Foldkit is a complete TypeScript frontend framework built on Effect and
architected like Elm. Model application behavior with Foldkit's established
architecture instead of introducing alternate state, routing, effect, or UI
patterns.

## How to approach the work

- Pattern-match against Foldkit's own applications. The focused examples,
  website, and typing game are the canonical references.
- Preserve unidirectional data flow: pure Models, Messages, updates, and views;
  run effects only through Foldkit runtime seams.
- Treat Foldkit UI's stateful Submodels separately from its stateless render
  helpers. Do not introduce Submodel state for a stateless component.
- Prefer Foldkit and Effect primitives over outside libraries when the stack
  already supplies the capability.
- Let `evo` setters receive the current field when they only transform that
  field. Use replacement functions for values from Messages, child results,
  Commands, or other Model fields.
- Treat the vendored repository as more authoritative than memory or a stale
  project snapshot.

## Repository references

This project vendors Foldkit at `.context/foldkit/`.

- `.context/foldkit/examples/`: focused runnable examples
- `.context/foldkit/packages/`: framework source and production applications
- `.context/foldkit/skills/`: current task-oriented instructions
- `.context/foldkit/AGENTS.md`: upstream repository conventions
- `.context/foldkit/README.md`: framework overview

List directories before relying on individual filenames because upstream paths
can change.

## Audits

For an explicit Foldkit audit, read `audit-program.md` completely and follow
its report-first workflow. Its canonical reference snapshots are in
`generate-program/`; when they differ from `.context/foldkit/`, the vendored
upstream repository wins.
