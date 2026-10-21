# @urm/domain

Backend-independent value schemas shared by URM applications and the server.

Persistent records, identifiers, and indexes belong to `@urm/db`; authorization
relationships and operation contracts belong to `@urm/auth` and
`@urm/contracts`. This package contains only values
whose validation must be identical across runtimes, such as email addresses,
email lifecycle states, and appearance choices.

## Read and write boundaries

Stored read models remain lenient enough to load older values for correction.
Write inputs apply current validation; decode unknown inputs at the boundary
rather than relying on TypeScript annotations. Normalization is a separate step.
Schemas establish value shape, not workspace ownership or permission to mutate.

[Document content](src/schemas/documents.ts) separates outer input validation
from rich-text decoding. Text formats pass through unchanged; decoding is not
HTML sanitization. [Contacts](src/schemas/contacts.ts) similarly separates stored
contact values from stricter email and telephone write validators.

[Custom data tables](src/schemas/data-tables.ts) describe application records,
not runtime database DDL. Stable column keys and schema/row revisions let the
repository detect stale edits without changing the PostgreSQL schema per table.
