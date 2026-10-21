```ts
// Use Effect-TS to properly scope Domain context
import { Effect, Context } from "effect"

class DomainId extends Context.Tag("DomainId")<DomainId, string>() {}

// Zero mutators with Domain isolation
const updateTodo = Effect.gen(function* (_) {
  const DomainId = yield* _(DomainId)
  const tx = yield* _(ZeroTransaction)

  // Domain-scoped query
  yield* _(tx.set(`todo/${DomainId}/${id}`, data))
})
```
