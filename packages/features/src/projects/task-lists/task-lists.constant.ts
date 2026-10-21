import type { TaskListStatus } from "./task-lists.model.ts"

export const taskListInputId = (status: TaskListStatus): string =>
    `new-task-list-${status}`
