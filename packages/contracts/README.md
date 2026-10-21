# @urm/contracts

Contracts should only depend on `@urm/domain`

**API definitions for HTTP and RPC endpoints. Defines the contract between client
and server.**

- [Zod to Effect](https://github.com/Adammatthiesen/zod-to-effect-example)
    <!--https://github.com/Adammatthiesen/kysely-astro-->

pure data shapes, shared interfaces, API boundaries, DTOs. Anything that defines what data looks like or what an implementer must provide, with no opinion on how.

- [Example Todo Contact - Tanstack Effect Example](https://github.com/kevin-courbet/tanstack-effect-example/blob/main/src/server/features/example-todo/example-todo.contract.ts)

**Type-safe RPC contracts for client-server communication.**

## Position in Dependency Hierarchy

```
@urm/domain
    ↓
@urm/contracts ← YOU ARE HERE
    ↓
@urm/server
@urm/utils
    ↓
apps/*
```

## What Belongs Here

- **RPC group definitions**: `makeRpcGroup()` calls
- **RPC method definitions**: `makeRpc()` calls
- **Feature schemas**: Data structures that cross the RPC boundary
- **Validation errors**: `Schema.TaggedError` for RPC failures

## What Does NOT Belong Here

- ❌ Business logic (go in `@urm/server/services`)
- ❌ Database code (go in `@urm/server/repositories`)
- ❌ RPC runtime/client code (go in `@urm/utils`)
- ❌ Server-only middleware (go in `@urm/server/handlers`)
- ❌ Base schemas like `NoPayload` (now in `@urm/domain`)

## Base Schemas

`NoPayload` and other base schemas have moved to `@urm/domain`:

```typescript
// NEW - Import from domain:
import { NoPayload } from "@urm/domain";

// OLD (deprecated):
// import { NoPayload } from "@urm/contracts/example-todo";  ⚌ Don't use
```

## Deep Modules Pattern

```typescript
// User sees this (small interface):
import { ExampleTodoRpc, ExampleTodoSchema } from "@urm/contracts/example-todo";

// Implementation includes:
// - makeRpc() definitions
// - Schema.Struct definitions
// - TaggedError classes
// - But users only need the exports from index.ts
```

## Client/Server Separation

✅ **Safe for both client and server**

This package defines the contract - the interface between client and server. Both sides need these types.

**Client usage:**

```typescript
import { ExampleTodoRpc } from "@urm/contracts/example-todo";
import { callRpc } from "@urm/utils";

await callRpc(ExampleTodoRpc, (client) => client.exampleTodo.listTodos({}));
```

**Server usage:**

```typescript
import { ExampleTodoRpc } from "@urm/contracts/example-todo";
import { ExampleTodoRpcLive } from "@urm/server/handlers";

// Handlers implement the contract
export const handlers = ExampleTodoRpc.toLayer(/* ... */);
```

## Available Modules

- `@urm/contracts` - Aggregates `AppRpc` (all RPC groups)
- `@urm/contracts/app` - The merged AppRpc group
- `@urm/contracts/example-todo` - Example todo feature contracts

## Adding a New Feature

1. Create `src/<feature>/schemas.ts` with data schemas
2. Create `src/<feature>/index.ts` with RPC group
3. Export from `src/index.ts`
4. Merge into `src/app/index.ts` if it should be part of main API

## Testing

```bash
pnpm test
```

Tests verify schema validation and error types.

## Repositories

Repositories abstract data access logic behind an interface.

The repository acts as a middleman between your business logic and your data source
(database, API, etc.). Your application code never talks to the database directly
— it only talks to the repository interface.

Database agnostic, so tests can inject mock, prod injects the real database.

Depends on domain types. API/RPC depends on Contracts.
