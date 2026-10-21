/**
 * # Legacy Database Schema Interface
 *
 * Preserved for the restored runtime. The canonical foundation is ../schema/index.ts.
 */
export { contacts, type Contact, type NewContact } from "./contacts/index.ts"

export {
    auth_accounts,
    auth_domain_handoffs,
    auth_email_verification_tokens,
    auth_oauth_states,
    auth_password_credentials,
    auth_password_reset_tokens,
    auth_rate_limit_buckets,
    audit_events,
    auth_sessions,
    observability_logs,
    observability_spans,
    type AuditEvent,
    type AuthAccount,
    type AuthDomainHandoff,
    type AuthEmailVerificationToken,
    type AuthOauthState,
    type AuthPasswordCredential,
    type AuthPasswordResetToken,
    type AuthRateLimitBucket,
    type AuthSession,
    type NewAuditEvent,
    type NewAuthAccount,
    type NewAuthDomainHandoff,
    type NewAuthEmailVerificationToken,
    type NewAuthOauthState,
    type NewAuthPasswordCredential,
    type NewAuthPasswordResetToken,
    type NewAuthRateLimitBucket,
    type NewAuthSession,
    type ObservabilityLog,
    type NewObservabilityLog,
    type ObservabilitySpan,
    type NewObservabilitySpan,
    type ObservabilitySpanEvent,
} from "./auth/index.ts"

export { csv_data, type CsvData, type NewCsvData } from "./csv/index.ts"

export {
    csv_uploads,
    csvUploadStatusEnum,
    type CsvUpload,
    type NewCsvUpload,
} from "./csv/index.ts"

export {
    documents,
    contentTypeEnum,
    type Document,
    type NewDocument,
} from "./documents/index.ts"

export {
    email_notifications,
    email_deliveries,
    email_subscriptions,
    email_newsletter_sends,
    email_unsubscribe_tokens,
    email_type,
    email_status,
    type EmailDelivery,
    type EmailNewsletterSend,
    type EmailNotification,
    type EmailSubscription,
    type EmailUnsubscribeToken,
    type NewEmailDelivery,
    type NewEmailNewsletterSend,
    type NewEmailNotification,
    type NewEmailSubscription,
    type NewEmailUnsubscribeToken,
} from "./email/index.ts"

export {
    platform_newsletter_subscriber_status,
    platform_newsletter_token_purpose,
    platform_newsletter_subscribers,
    platform_newsletter_tokens,
    platform_newsletter_sends,
    type PlatformNewsletterSubscriber,
    type NewPlatformNewsletterSubscriber,
    type PlatformNewsletterToken,
    type NewPlatformNewsletterToken,
    type PlatformNewsletterSend,
    type NewPlatformNewsletterSend,
} from "./email/index.ts"

export {
    domains,
    domain_hostnames,
    platform_admin,
    domain_contacts,
    domain_admin,
    domain_visitors,
    domain_customers,
    contact_submissions,
    domain_hostname_kind,
    domain_hostname_status,
    platform_admin_role,
    platform_admin_status,
    domain_admin_role,
    domain_admin_status,
    type Domain,
    type DomainHostname,
    type NewDomain,
    type NewDomainHostname,
    type PlatformAdmin,
    type NewPlatformAdmin,
    type DomainContact,
    type NewDomainContact,
    type DomainAdmin,
    type NewDomainAdmin,
    type DomainVisitor,
    type NewDomainVisitor,
    type DomainCustomer,
    type NewDomainCustomer,
    type ContactSubmission,
    type NewContactSubmission,
} from "./domains/index.ts"

export { entity_tags, type EntityTag, type NewEntityTag } from "./tags/index.ts"

export { events, type Event, type NewEvent } from "./events/index.ts"
export {
    event_menu_items,
    menuCategoryEnum,
    type EventMenuItem,
    type NewEventMenuItem,
} from "./events/index.ts"

export { images, type Image, type NewImage } from "./media/images.ts"

export {
    issues,
    issueStatusEnum,
    issuePriorityEnum,
    type Issue,
    type NewIssue,
} from "./issues/index.ts"
export {
    issue_labels,
    type IssueLabel,
    type NewIssueLabel,
} from "./issues/index.ts"

export { members, type Member, type NewMember } from "./members/index.ts"

export {
    orgs,
    org_contacts,
    org_invitations,
    org_contact_role,
    org_contact_status,
    type Org,
    type NewOrg,
    type OrgContact,
    type NewOrgContact,
    type OrgInvitation,
    type NewOrgInvitation,
} from "./organisations/index.ts"

export {
    demo_workspace_status,
    demo_workspaces,
    demo_workspace_domains,
    type DemoWorkspace,
    type NewDemoWorkspace,
    type DemoWorkspaceDomain,
    type NewDemoWorkspaceDomain,
} from "./demo-workspaces/index.ts"

export { messages, type Message, type NewMessage } from "./chat/index.ts"

export {
    preferences,
    type Preference,
    type NewPreference,
    marketing_appearance,
    type MarketingAppearance,
    type NewMarketingAppearance,
} from "./settings/index.ts"

export { products, type Product, type NewProduct } from "./shop/index.ts"
export {
    product_variants,
    type ProductVariant,
    type NewProductVariant,
} from "./shop/index.ts"
export {
    product_collections,
    type ProductCollection,
    type NewProductCollection,
} from "./shop/index.ts"
export { carts, type Cart, type NewCart } from "./shop/index.ts"
export { cart_items, type CartItem, type NewCartItem } from "./shop/index.ts"
export {
    orders,
    orderStatusEnum,
    type Order,
    type NewOrder,
    type Address,
} from "./shop/index.ts"
export {
    order_items,
    fulfillmentStatusEnum,
    type OrderItem,
    type NewOrderItem,
} from "./shop/index.ts"
export { customers, type Customer, type NewCustomer } from "./shop/index.ts"
export {
    payments,
    paymentStatusEnum,
    type Payment,
    type NewPayment,
} from "./shop/index.ts"

export { tags, type Tag, type NewTag } from "./tags/index.ts"

export {
    todo_list_items,
    type TodoListItem,
    type NewTodoListItem,
} from "./tasks/index.ts"
