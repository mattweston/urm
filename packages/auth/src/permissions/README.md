# @urm/permissions

Centralized permission system for URM with linear role hierarchy and Effect-TS patterns.

## Overview

This package provides:

- **Linear role hierarchy** - user → member → admin (each role inherits lower privileges)
- **Type-safe role definitions** - Using Effect Schema for validation
- **Role comparison utilities** - Simple functions to check authorization
- **Error types** - `UnauthorizedError` and `ForbiddenError` for consistent error handling
- **Documentation** - Comprehensive JSDoc and Future Context-based patterns

## Roles

The system defines three roles with a linear hierarchy:

| Role       | Level | Description                                 |
| ---------- | ----- | ------------------------------------------- |
| **user**   | 1     | Base privileges (default on signup)         |
| **member** | 2     | Intermediate privileges (inherits user)     |
| **admin**  | 3     | Full system access (inherits member + user) |

### Hierarchy Behavior

- **Admin** can do everything (access all user and member resources)
- **Member** can access all user resources plus member-specific ones
- **User** has base privileges only

This simplifies authorization logic: checking `hasRoleOrHigher(user.role, "admin")` is sufficient to determine if a user can access admin resources.

## Usage

### Basic Role Check

```typescript
import { hasRoleOrHigher, UnauthorizedError } from "@urm/permissions";

// Check if user has required role
if (!hasRoleOrHigher(user.role, "admin")) {
  yield * new UnauthorizedError("Admin role required to access this resource");
}
```

### Route-Level Authorization (Phase 5+)

```typescript
import { requireRole } from "@urm/permissions/middleware";
import { HttpApi, Handler } from "@effect/platform";
import { Effect } from "effect";

// Protect route with role requirement
export const adminUsersRoute = HttpApi.get("/admin/users").pipe(
  Handler.make((req) =>
    Effect.gen(function* () {
      yield* requireRole("admin"); // Middleware guard
      // ... handler logic
    }),
  ),
);
```

### Get All Roles with Sufficient Privilege

```typescript
import { getRolesWithPrivilege } from "@urm/permissions";

// Get roles that can access member resources
const memberPlusRoles = getRolesWithPrivilege("member");
// Returns: ["member", "admin"]
```

### Get Role Level

```typescript
import { getRoleLevel } from "@urm/permissions";

const adminLevel = getRoleLevel("admin"); // Returns 3
const userLevel = getRoleLevel("user"); // Returns 1

if (getRoleLevel(user.role) >= getRoleLevel("member")) {
  // User is member or admin
}
```

## Error Handling

### UnauthorizedError

Raised when user lacks required role/authentication:

```typescript
import { UnauthorizedError } from "@urm/permissions";

if (!hasRoleOrHigher(user.role, "admin")) {
  yield *
    new UnauthorizedError(
      "Admin role required",
      "admin", // Required role
      user.role, // Actual role
    );
}
```

Typically results in **HTTP 401 Unauthorized**.

### ForbiddenError

Raised when user is authenticated but lacks specific resource permission:

```typescript
import { ForbiddenError } from "@urm/permissions";

// User is authenticated but can't modify another user's resource
if (resource.ownerId !== currentUser.id) {
  yield *
    new ForbiddenError("You don't have permission to modify this resource");
}
```

Typically results in **HTTP 403 Forbidden**.

## Architecture Notes

### Design Decisions

- **Linear hierarchy**: Simplifies authorization logic (no complex permission matrices)
- **Effect-TS patterns**: Uses Schema.TaggedError for error types, ready for Layer composition
- **Separate package**: Reusable across apps (server, CLI, future web)
- **Future extensibility**: Comments document path to Context.Tag<Role> pattern

### Current Status

- ✅ Phase 1 complete: Role hierarchy and basic utilities
- 🔄 Phase 5: Middleware pattern for route-level guards (requireRole)
- 📋 Future: ABAC (Attribute-Based Access Control) for fine-grained permissions

### Future: Effect Context Pattern

The code includes documentation for migrating to Effect Context for state-based auth:

```typescript
import { Context } from "effect"

// More idiomatic Effect pattern
export interface AuthContext {
  readonly role: Role
  readonly userId: string
  readonly email: string
}

export const CurrentAuth = Context.Tag<AuthContext>()

// Usage in handlers
const withAuth = (role: Role): Effect<void, UnauthorizedError> =>
  Effect.gen(function* () {
    const auth = yield* CurrentAuth
    if (!hasRoleOrHigher(auth.role, role)) {
      yield* new UnauthorizedError(...)
    }
  })
```

## Testing

Run tests with:

```bash
bunx vitest packages/permissions/tests/roles.test.ts
```

Tests verify:

- Role hierarchy levels (1, 2, 3)
- Role comparisons (higher roles inherit lower privileges)
- Privilege checking utilities
- Mathematical properties (transitivity, reflexivity, antisymmetry)
- Consistency across functions

## Related Packages

- **@urm/auth** - Authentication and OAuth integration
- **@urm/schema** - Database schema definitions (includes role enum)
- **@urm/users** - User management and profiles

## See Also

- `RBAC Implementation` - How roles are enforced on routes (Phase 5)
- `Web Frontend Auth` - Protected routes in Solid-Start app (Phase 7)
- `CLI User Management` - Creating users with roles via CLI (Phase 3c)
