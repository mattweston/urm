const CRM_PATH = "/labs/contacts/crm"
export const crmHref = () => `${CRM_PATH}/`
export const isCrmPath = (pathname: string): boolean =>
    pathname === CRM_PATH || pathname === `${CRM_PATH}/`
