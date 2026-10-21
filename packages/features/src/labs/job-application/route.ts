const PATH = "/labs/forms/job-application"

export const jobApplicationHref = () => `${PATH}/`

export const isJobApplicationPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`
