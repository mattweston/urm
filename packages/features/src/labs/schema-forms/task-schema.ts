import { Schema as S } from "effect"
import { TodoListItem } from "@urm/domain/schemas/tasks"

// Lab edit values, not a complete record or server request.
export const TaskForm = S.Struct({
    text: S.Trimmed.check(S.isMinLength(1), S.isMaxLength(200)),
    status: TodoListItem.fields.status,
    priority: TodoListItem.fields.priority,
    completed: TodoListItem.fields.completed,
    order: S.NumberFromString.check(S.isInt(), S.isGreaterThanOrEqualTo(0)),
})
export type TaskForm = typeof TaskForm.Type
