const PATH = "/forms/fieldset"

export const fieldsetHref = () => `${PATH}/`

export const isFieldsetPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`
