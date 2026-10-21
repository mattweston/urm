const FILE_TREE_PATH = "/labs/ui/file-tree"

export const fileTreeHref = () => `${FILE_TREE_PATH}/`

export const isFileTreePath = (pathname: string): boolean =>
    pathname === FILE_TREE_PATH || pathname === `${FILE_TREE_PATH}/`
