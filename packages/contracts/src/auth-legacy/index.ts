export {
    ActiveDomainRequestContext,
    ActiveDomainRpcMiddleware,
    PublicWorkerRequestContext,
    PublicWorkerRpcMiddleware,
    DomainManagerRpcMiddleware,
    AuthenticatedRequestContext,
    AuthenticatedRpcMiddleware,
    PlatformAdminRpcMiddleware,
} from "./rpc-middleware.ts"

export type { AuthenticatedRpcRequestContext } from "./rpc-middleware.ts"
export type { ActiveDomainRequest } from "./rpc-middleware.ts"
export type { PublicWorkerRpcRequest } from "./rpc-middleware.ts"

export {
    AuthResponse,
    AuthSession,
    AuthContact,
    AuthCurrentDomain,
    AuthPlatformAdmin,
    CredentialsLoginInput,
    CredentialsSignUpInput,
    EmailChangeInput,
    EmailChangeConfirmInput,
    EmailVerificationConfirmInput,
    EmailVerificationRequestInput,
    PasswordChangeInput,
    PasswordResetConfirmInput,
    PasswordResetRequestInput,
    hasRoleOrHigher,
} from "@urm/domain/auth"
export type {
    AuthContextType,
    AuthContactType,
    AuthCurrentDomainType,
    AuthPlatformAdminType,
    AuthResponseType,
    AuthSessionType,
    CredentialsLoginInputType,
    CredentialsSignUpInputType,
    EmailChangeInputType,
    EmailChangeConfirmInputType,
    EmailVerificationConfirmInputType,
    EmailVerificationRequestInputType,
    PasswordChangeInputType,
    PasswordResetConfirmInputType,
    PasswordResetRequestInputType,
    Role,
} from "@urm/domain/auth"
