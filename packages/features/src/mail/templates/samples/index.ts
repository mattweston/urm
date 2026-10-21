import type { Html } from "foldkit/html"
import { invoice_view } from "../invoice.ts"
import { sample_invoice } from "../invoice.sample.ts"

import * as AccountDeleted from "./account-deleted.ts"
import * as ConfirmEmail from "./confirm-email.ts"
import * as DomainVerified from "./domain-verified.ts"
import * as NewDeviceLogin from "./new-device-login.ts"
import * as OtpSignin from "./otp-signin.ts"
import * as OrderReceipt from "./order-receipt.ts"
import * as PaymentFailed from "./payment-failed.ts"
import * as PolicyUpdate from "./policy-update.ts"
import * as QuotaExceeded from "./quota-exceeded.ts"
import * as QuotaWarning from "./quota-warning.ts"
import * as ResetPassword from "./reset-password.ts"
import * as ReviewRequest from "./review-request.ts"
import * as ShippingNotification from "./shipping-notification.ts"
import * as ShippingReceipt from "./shipping-receipt.ts"
import * as TeamInvite from "./team-invite.ts"
import * as VerifyIdentity from "./verify-identity.ts"
import * as WeeklyDigest from "./weekly-digest.ts"
import * as Welcome from "./welcome.ts"

export interface SampleTemplate {
    id: string
    name: string
    category: string
    view: () => Html
}

export const allSamples: ReadonlyArray<SampleTemplate> = [
    {
        id: "sample-invoice",
        name: "Invoice",
        category: "Transactional",
        view: () => invoice_view(sample_invoice),
    },
    {
        id: "sample-welcome",
        name: "Welcome Email",
        category: "Onboarding",
        view: Welcome.view,
    },
    {
        id: "sample-reset-password",
        name: "Reset Password",
        category: "Security",
        view: ResetPassword.view,
    },
    {
        id: "sample-confirm-email",
        name: "Confirm Email",
        category: "Security",
        view: ConfirmEmail.view,
    },
    {
        id: "sample-verify-identity",
        name: "Verify Identity",
        category: "Security",
        view: VerifyIdentity.view,
    },
    {
        id: "sample-otp-signin",
        name: "OTP Sign-in",
        category: "Security",
        view: OtpSignin.view,
    },
    {
        id: "sample-domain-verified",
        name: "Domain Verified",
        category: "Platform",
        view: DomainVerified.view,
    },
    {
        id: "sample-new-device-login",
        name: "New Device Login",
        category: "Security",
        view: NewDeviceLogin.view,
    },
    {
        id: "sample-team-invite",
        name: "Team Invite",
        category: "Collaboration",
        view: TeamInvite.view,
    },
    {
        id: "sample-review-request",
        name: "Review Request",
        category: "Engagement",
        view: ReviewRequest.view,
    },
    {
        id: "sample-weekly-digest",
        name: "Weekly Digest",
        category: "Engagement",
        view: WeeklyDigest.view,
    },
    {
        id: "sample-order-receipt",
        name: "Order Receipt",
        category: "Transactional",
        view: OrderReceipt.view,
    },
    {
        id: "sample-shipping-receipt",
        name: "Shipping Receipt",
        category: "Transactional",
        view: ShippingReceipt.view,
    },
    {
        id: "sample-shipping-notification",
        name: "Shipping Notification",
        category: "Transactional",
        view: ShippingNotification.view,
    },
    {
        id: "sample-payment-failed",
        name: "Payment Failed",
        category: "Transactional",
        view: PaymentFailed.view,
    },
    {
        id: "sample-policy-update",
        name: "Policy Update",
        category: "Transactional",
        view: PolicyUpdate.view,
    },
    {
        id: "sample-account-deleted",
        name: "Account Deleted",
        category: "Transactional",
        view: AccountDeleted.view,
    },
    {
        id: "sample-quota-warning",
        name: "Quota Warning",
        category: "Billing",
        view: QuotaWarning.view,
    },
    {
        id: "sample-quota-exceeded",
        name: "Quota Exceeded",
        category: "Billing",
        view: QuotaExceeded.view,
    },
]

export const sampleById = (id: string): SampleTemplate | null =>
    allSamples.find((template) => template.id === id) ?? null

export const sampleCategories: ReadonlyArray<string> = [
    ...new Set(allSamples.map((template) => template.category)),
]
