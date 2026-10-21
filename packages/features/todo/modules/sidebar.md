Sidebar customization is implemented at Settings → Sidebar.

- Visible grip handles support pointer and keyboard reordering of top-level groups.
- Save persists a draft; Cancel restores saved preferences; Reset stages defaults.
- Dashboard and Domains keep their fixed positions and stay visible.
- Settings is draggable but cannot be hidden.
- `sidebar_preferences` stores ordering and hidden items per authenticated user
  and domain, independently of domain module availability.
- Hidden items remain accessible by URL. Disabled modules retain their place in
  the ordering for re-enabling. Child routes move with their parent group.
- The shared sidebar renderer remains stateless. The navigation settings feature
  owns drafts and drag state; the client owns persistence and derived navigation.
- Drag subscriptions have unique names and only run on the sidebar settings page.

Implementation: `packages/features/src/settings/navigation/index.ts`,
`apps/client/src/main.ts`, and `packages/rpc/src/handlers/settings/`.
Architecture rationale: `apps/docs/content/data/model-notes.md`.
