export {
    DomainsAddAdminRpc,
    DomainsCreateRpc,
    DomainsCreateHostnamesRpc,
    DomainsDeleteRpc,
    DomainsDeleteHostnameRpc,
    DomainsGetAdminRoleRpc,
    DomainsGetRpc,
    DomainsListAdminsRpc,
    DomainsListHostnamesRpc,
    DomainsListRpc,
    DomainsProvisionHostnameCertificateRpc,
    DomainsResolveHostnameRpc,
    DomainsRemoveAdminRpc,
    DomainsRpcs,
    DomainsUpdateAdminRoleRpc,
    DomainsUpdateRpc,
    DomainsVerifyHostnameDnsRpc,
} from "./routes.ts"

export type { DomainsRepositoryType } from "../repositories/domains.ts"
