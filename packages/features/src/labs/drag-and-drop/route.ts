const PATH = "/labs/ui/drag-and-drop"

export const dragAndDropHref = () => `${PATH}/`

export const isDragAndDropPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`
