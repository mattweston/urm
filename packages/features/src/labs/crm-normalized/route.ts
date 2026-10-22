const CRM_NORMALIZED_PATH = "/contacts/crm-normalized"
export const crmNormalizedHref = () => `${CRM_NORMALIZED_PATH}/`
export const isCrmNormalizedPath = (pathname: string): boolean =>
    pathname === CRM_NORMALIZED_PATH || pathname === `${CRM_NORMALIZED_PATH}/`
