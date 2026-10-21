const ARRAY_FOLD_PATH = "/labs/array-fold"

export const arrayFoldHref = () => `${ARRAY_FOLD_PATH}/`

export const isArrayFoldPath = (pathname: string): boolean =>
    pathname === ARRAY_FOLD_PATH || pathname === `${ARRAY_FOLD_PATH}/`
