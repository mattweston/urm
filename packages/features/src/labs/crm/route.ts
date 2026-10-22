const CRM_PATH = "/contacts/crm"
export const crmHref = () => `${CRM_PATH}/`
export const isCrmPath = (pathname: string): boolean =>
    pathname === CRM_PATH || pathname === `${CRM_PATH}/`
