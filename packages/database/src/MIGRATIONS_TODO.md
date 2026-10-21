If you do want drizzle-kit generate to work later, you'd need to either:

Manually create a meta/\_journal.json and meta/snapshot.json reflecting current DB state (one-time setup)
Or add a hook in migrator.ts that updates the snapshot after applying
