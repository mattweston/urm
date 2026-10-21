/**
 * # Chat Model
 *
 * Pairs Drizzle table with Effect schemas
 *
 * Re-exports schemas from @urm/shared (source of truth)
 * and table from db/schema (database structure).
 *
 * This file is the "model aggregator" for the chat feature:
 * - Drizzle table: messages
 * - Effect schemas: Message, SendMessageRequest
 * - Error types: NotFoundError, DatabaseError, ConflictError
 */

import {
    Message,
    SendMessageRequest,
    NotFoundError,
    DatabaseError,
    ConflictError,
} from "@urm/domain/schemas/chat"

// Re-export Drizzle table and inferred types
export { messages } from "@urm/db/legacy-schema/chat"
export type { Message as MessageRow, NewMessage } from "@urm/db/legacy-schema/chat"

// Re-export Effect schemas (used in routes and handlers)
export {
    Message,
    SendMessageRequest,
    NotFoundError,
    DatabaseError,
    ConflictError,
}

/*

The Point of Re-exporting from Models
The model.ts file is a centralized aggregation point that brings together everything related to a feature. Let me explain why re-exporting matters:
What Gets Re-exported and Why
In apps/server/src/api/rpc/chat/model.ts:
// Re-export Drizzle table
export { messages } from "../../../db/schema/chat/index.js";
// Re-export Effect schemas
export {
  Message,
  SendMessageRequest,
  NotFoundError,
  DatabaseError,
  ConflictError,
} from "@urm/shared";
// Define model pairing
export const ChatModel = {
  insert: SendMessageRequest,
  update: Schema.partial(SendMessageRequest),
  select: Message,
};
The Real Benefits
1. Single Import Point (DRY Principle)
Instead of scattered imports across your codebase:
// ❌ BAD - Scattered imports everywhere
// In handlers.ts
import { messages } from "../../../db/schema/chat";
import { Message, SendMessageRequest } from "@urm/shared";
// In repository.ts
import { messages } from "../../../db/schema/chat";
import { Message, SendMessageRequest, DatabaseError } from "@urm/shared";
// In routes.ts
import { Message, SendMessageRequest } from "@urm/shared";
// In tests
import { messages } from "../../../db/schema/chat";
import { Message, DatabaseError } from "@urm/shared";
You have one canonical source:
// ✅ GOOD - Single import point
// handlers.ts
import { messages, Message, SendMessageRequest } from "./model.js";
// repository.ts
import { messages, Message, SendMessageRequest, DatabaseError } from "./model.js";
// routes.ts
import { Message, SendMessageRequest } from "./model.js";
// tests
import { messages, Message, DatabaseError } from "./model.js";
2. Dependency Clarity
The model file explicitly documents what a feature needs:
// Looking at model.ts tells you:
// - We use the 'messages' Drizzle table
// - We use Message schema for validation
// - We accept SendMessageRequest inputs
// - We can fail with DatabaseError or ConflictError
// This is the complete dependency list for the chat feature
3. Prevents Circular Dependencies
Without re-exports in model.ts, you might import from different places and accidentally create cycles:
// ❌ POTENTIAL PROBLEM
// handlers.ts imports from contracts
import { ChatRpcs } from "@urm/contracts/chat";
// routes.ts imports from handlers
import { ChatRpcHandlers } from "./handlers.js";
// Circular dependency!
// ✅ SOLUTION - Everything goes through model.ts
// handlers.ts imports from model
import { Message, SendMessageRequest } from "./model.js";
// routes.ts imports from model
import { Message, SendMessageRequest } from "./model.js";
// No circular dependency!
4. Easier Refactoring
When you need to move where something comes from, you only update the model file:
// Example: Later you decide to move Message to a separate schema file
// Before refactoring:
// In model.ts: export { Message } from "@urm/shared";
// After refactoring:
// In model.ts: export { Message } from "./message.schema.js";
// Every file that imports from model.ts still works unchanged!
// No need to update 10+ files across handlers, routes, tests, etc.
5. Feature Isolation
The model file acts as a public API for the feature:
// model.ts is like saying:
// "Here's everything you need to work with chat"
//
// If something isn't exported from model.ts,
// other parts of the app shouldn't be using it directly
This creates a clear boundary:
// ✅ OK - Using the public API
import { Message, messages } from "./chat/model.js";
// ❌ NOT OK - Bypassing the public API
import { messages } from "../../db/schema/chat/messages.ts";  // Direct import!
// This tells you the developer is doing something unusual
// that should be added to model.ts instead
6. Co-location of Related Types
The model file groups everything that "belongs together":
// This is saying: "These things are semantically related"
export { messages } from "../../../db/schema/chat";  // Database structure
export { Message, SendMessageRequest } from "@urm/shared";  // Domain models
export const ChatModel = { ... };  // The pairing that uses both
// A future developer reading this understands:
// - messages table = where data lives
// - Message/SendMessageRequest = how we model data
// - ChatModel = how they work together
Practical Example: Adding a New Field
Let's say you need to add pinned_message boolean to messages.
Without model.ts re-exports (chaos):
// Update 1: db/schema/chat/messages.ts
export const messages = pgTable("messages", {
  id: varchar(...).primaryKey(),
  // ... existing fields ...
  pinned_message: boolean("pinned_message"),  // NEW
});
// Update 2: packages/shared/src/chat.ts
export const Message = Schema.Struct({
  // ... existing fields ...
  pinned_message: Schema.Boolean,  // NEW
});
// Update 3: api/rpc/chat/handlers.ts
import { Message, pinned_message } from "@urm/shared";  // OOPS - wrong import path
// Update 4: api/rpc/chat/routes.ts
// Also needs updating
// Update 5: tests/chat.test.ts
// Also needs updating
// Update 6: other places...
// This gets messy fast - where else is Message imported?
With model.ts re-exports (clean):
// Update 1: db/schema/chat/messages.ts
export const messages = pgTable("messages", {
  id: varchar(...).primaryKey(),
  // ... existing fields ...
  pinned_message: boolean("pinned_message"),  // NEW
});
// Update 2: packages/shared/src/chat.ts
export const Message = Schema.Struct({
  // ... existing fields ...
  pinned_message: Schema.Boolean,  // NEW
});
// Update 3: apps/server/src/api/rpc/chat/model.ts
// No change needed! Re-exports already include messages and Message
// Everything automatically has the new field
// All other files work automatically because they import from model.ts!
The Philosophy
The model file implements the Facade pattern:
Complex internals (db/schema, @urm/shared, etc)
          ↓
    model.ts (simple, clean facade)
          ↓
Everything else (handlers, routes, tests, etc)
Other files don't need to know:
- Where Message comes from
- Where messages table comes from
- Which errors are relevant
- How to pair them together
They just import from the model and get what they need.
Summary
Aspect	Without Model Re-exports	With Model Re-exports
Import consistency	Scattered across codebase	Single canonical point
Refactoring impact	Update 10+ files	Update 1 file
Circular dependencies	Risk if not careful	Prevented by design
Feature boundary	Unclear what's public	Clear public API
Onboarding	Where do I import from?	Always from model.ts
Type of change	"Update X, Y, Z files"	"Update model.ts"
The model.ts file is essentially saying: "I'm the one-stop shop for everything you need to work with this feature. Import from me, not from 10 different places."


*/
