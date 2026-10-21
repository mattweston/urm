# Env

- env/
  src/
  server.ts ← validates server env vars (DATABASE*URL, JWT_SECRET, etc.)
  client.ts ← validates public env vars (NEXT_PUBLIC*_, EXPO*PUBLIC*_, etc.)
  index.ts ← re-exports both
