/\*\*

- # Tasks RPC Model
-
- Pairs Drizzle table with Effect schemas
-
- Re-exports schemas from @urm/shared (source of truth)
- and tables from db/schema (database structure).
-
- This file is the "model aggregator" for the tasks feature:
-   - Drizzle table: todo_list_items
-   - Effect schemas: TodoListItem, CreateTodoListItemInput, UpdateTodoListItemInput
-   - Error types: NotFoundError, DatabaseError
- \*/

import {
TodoListItem,
CreateTodoListItemInput,
UpdateTodoListItemInput,
NotFoundError,
DatabaseError,
ConflictError,
ValidationError,
} from "@urm/domain/schemas/tasks";

// Re-export Drizzle tables and inferred types
export { todo_list_items } from "@urm/db/schema/tasks/todo-list-items";
export type {
TodoListItem as TodoListItemRow,
NewTodoListItem,
} from "@urm/db/schema/tasks/todo-list-items";

// Re-export Effect schemas (used in routes and handlers)
export {
TodoListItem,
CreateTodoListItemInput,
UpdateTodoListItemInput,
NotFoundError,
DatabaseError,
ConflictError,
ValidationError,
};

/\*\*

- Schema definitions for repository CRUD operations
-
- Must match Drizzle table structure:
-   - insert: schema for INSERT operations
-   - update: schema for UPDATE operations (Partial)
-
- Note: These are re-exports from @urm/shared, not duplicates.
- This prevents drift: enums/types are defined once, imported everywhere.
  \*/
  export const TodoListItemsModel = {
  insert: CreateTodoListItemInput,
  update: UpdateTodoListItemInput,
  select: TodoListItem,
  };
