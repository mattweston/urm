---
title: Permissions
history:
  - permissions_
---

Unauthorised mutations fail at the API layer before anything touches the database.

```ts
// Your API route — Effect enforces permissions before TanStack DB's handler fires
const updateContact = HttpApiEndpoint
    .patch('contact', '/contacts/:id')
    .pipe(
        Effect.gen(function* () {
            const auth = yield* AuthService
            const { userID } = yield* auth.currentUser()
            const { id } = yield* HttpServerRequest.params

            // Permission check happens here — before TanStack DB's onUpdate
            yield* auth.assertContactAccess(userID, id)

            // Now safe to process
            const body = yield* HttpServerRequest.json
            return yield* ContactService.update(id, body)
        })
  )
```

- [Permissions - Open Faith](https://github.com/FaithBase-AI/openfaith/blob/master/docs/Permissions.md)
