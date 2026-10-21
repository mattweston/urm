The original demo was primarily a router and local-first behavior showcase, not just an email UI.

It demonstrated:

- Real route loaders, actions, nested error boundaries, retry, and revalidation
- Delayed loading states without flashing for fast loads
- Deep links for every mailbox, message, and draft
- Fetcher mutations that remained active across navigation
- Optimistic starring without changing the URL
- Durable draft editing and duplicate-safe draft identity
- Dirty-form navigation blocking with focus restoration
- Native online/offline state
- Durable offline outbox queueing and automatic reconnect delivery
- Distinct empty, missing, loading, pending, and failed states
- Responsive keyboard-accessible navigation
- Deterministic fault injection for Playwright journeys

For a production feature, remove or replace:

- Artificial delays such as 45–700 ms.
- ?fault= failure injection.
- Query-scoped demo sessions.
- Random “Receive” message generation.
- Deterministic fixture-only identities and mail.
- Simulated reconnect delivery.
- Demo copy such as “Local-first spike”.
- Status text exposing internal query/replay mechanics unless useful diagnostically.

Keep the behavioral states, but connect them to real operations:

- Loading and pending states
- Empty and missing states
- Typed failure and retry surfaces
- Optimistic updates with rollback
- Dirty-compose protection
- Offline detection and durable outbox
- Idempotent sending
- Persistence across reloads
- Keyboard and responsive behavior

The best production direction is to reproduce the UI and state model at parity, while replacing demo delays, fault parameters, random mail, and simulated delivery with actual
services.
