/\*\*

- # Example Todo Repository
-
- @since 0.0.1
  \*/
  import { Context, Effect } from "effect";
  import type { UserId } from "@urm/domain/auth";

export type ExampleTodo = Readonly<{
id: number;
userId: UserId;
text: string;
createdAt: string;
}>;

/\*\*

- Example Todo repository operations
  \*/
  export interface ExampleTodoRepositoryType {
  list(userId: UserId): Effect.Effect<readonly ExampleTodo[]>;
  create(
  userId: UserId,
  data: { readonly text: string },
  ): Effect.Effect<ExampleTodo>;
  }

/\*\*

- Example Todo repository service tag for dependency injection
  \*/
  export class ExampleTodoRepository extends Context.Service<ExampleTodoRepository, ExampleTodoRepositoryType>()("ExampleTodoRepository") { }
