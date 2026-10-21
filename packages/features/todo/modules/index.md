Domain module availability is implemented at Settings → Modules.

The supported modules are Documents, Projects, Shop, Issues, Events, Tags, Mail,
Media, and Data. These are compile-time modules enabled or disabled at runtime;
this does not install arbitrary plugins or delete module data. Other utility
areas remain sidebar preferences.

- An optional `domains.enabled_modules` field stores availability. A missing
  field preserves all existing features; an empty array disables all supported
  modules.
- Domain administrators can change availability using the existing
  `domains:update` authorization policy.
- The client gates module queries, child subscriptions, routes, and child
  messages. Loaded feature data is cleared on disable. Dashboard cards follow
  module availability.
- Reactive backend collection queries authorize the domain and then return empty
  snapshots when disabled, avoiding errors before the browser unsubscribes.
  Writes and explicit document retrieval reject disabled modules.
- Shared uploads and references used by other enabled features remain available.
  Existing generated public websites are not unpublished by this setting.
- Sidebar order and visibility remain separate per-user, per-domain preferences.

Implementation uses preserved Models with gated lifecycles. Optional Models,
dependency-aware installation/removal, and public-site shutdown remain future
work. See `apps/docs/content/data/model-notes.md` for rationale and boundaries.
