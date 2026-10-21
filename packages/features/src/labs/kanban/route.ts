const PATH = "/labs/projects/kanban"

export const kanbanHref = () => `${PATH}/`

export const isKanbanPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`
