# Developer Grep

The view in this directory consumes development search results; corpus capture
and request handling live in `apps/client/grep-search.server.ts` and
`grep-preview.plugin.ts`. The configured root list there is authoritative.

Documentation and repository pickers filter different result sets. Search is
literal and case-sensitive; code punctuation and whitespace are meaningful.
Pagination and occurrence expansion must stay pinned to the captured corpus
snapshot rather than mix revisions after a watched file changes.

Write symbol contracts as TSDoc beside declarations. The client extracts API
documentation from source, so an independently maintained Markdown copy is not
needed. Use local package/app READMEs for workflows spanning modules and keep
examples that need typechecking in `llm-docs/`.

Corpus ingestion excludes generated, private and sensitive-name files. These
filters do not certify that every remaining file is public: production search
would need a curated corpus and publication boundary. The local benchmark and
capture limitations are documented in the
[search tool README](../../../../tools/search/README.md).
