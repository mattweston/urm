const PATH = "/labs/learn/state/model-tree"

export const model_tree_href = () => `${PATH}/`

export const is_model_tree_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`
