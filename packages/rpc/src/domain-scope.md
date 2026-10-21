```ts
// Use Effect-TS to properly scope tenant context
import { Effect, Context } from "effect"

class TenantId extends Context.Tag("TenantId")<TenantId, string>() {}

// Zero mutators with tenant isolation
const updateTodo = Effect.gen(function* (_) {
  const tenantId = yield* _(TenantId)
  const tx = yield* _(ZeroTransaction)

  // Tenant-scoped query
  yield* _(tx.set(`todo/${tenantId}/${id}`, data))
})
```
