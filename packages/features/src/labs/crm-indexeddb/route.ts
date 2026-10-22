const CRM_INDEXEDDB_PATH = "/contacts/crm-indexeddb"
export const crmIndexedDbHref = () => `${CRM_INDEXEDDB_PATH}/`
export const isCrmIndexedDbPath = (pathname: string): boolean =>
    pathname === CRM_INDEXEDDB_PATH || pathname === `${CRM_INDEXEDDB_PATH}/`
