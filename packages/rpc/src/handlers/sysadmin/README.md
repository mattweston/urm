# Sysadmin scope and observations

[account-sessions.ts](account-sessions.ts) rechecks the actual account session and
stored role. Tenant access requires the sysadmin membership role; ordinary owner
or admin status alone is insufficient. Platform access uses platform_sysadmin.
Selecting all tenants in the UI never grants that authority.

Account sessions belong to accounts, not domains. A tenant sample includes
sessions for its active members, including accounts shared with another tenant.
These rows do not prove which tenant a person was browsing. Classification uses
the requested as-of timestamp; bounded samples are not lifetime totals.

[account-telemetry.ts](account-telemetry.ts) applies filters before sampling and
keeps tenant queries scoped to the selected organization. Platform mode can
include records without an organization. UI state must clear on identity or
scope changes and authorization failures.

[telemetry-write.ts](telemetry-write.ts) records operation metadata without raw
mutation inputs, returned bodies or provider error messages. Failed operations
must not use a rejected client tenant id as trusted telemetry scope. Telemetry
transactions are separate from feature mutations, so observation is not an
atomic audit guarantee for the business write.
