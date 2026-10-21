publishing it must be authenticated, and future checkout needs protected server-side operations even if customers can buy as guests.

  I’d separate this into two areas.

  ### Secure publishing first

  Our current pipeline has workspace authorization, build approval, and isolated preview/production Workers. It still needs:

  - Trusted runner identity. Currently, the requesting client knows the job ticket and can report completion. Only an authenticated runner should be able to mark deployments
    successful.

  - Build once, promote the same files. We currently regenerate the saved snapshot. Store immutable artifacts and their hashes, then deploy exactly the bytes reviewed in preview.
  - Isolated build and deployment processes. Rendering content should not have Cloudflare credentials. Give only the deployment step narrowly scoped credentials, separate between
    development and production. OWASP pipeline guidance

  - Recovery and auditing. Record who approved which release and hostname; add deployment health checks, job recovery, and tested rollback.
  - Safe generated content. Escape/sanitize document content, restrict executable scripts, and add suitable security headers. Keep public sites separate from staff authentication
    cookies.

  ### Add checkout as a separate runtime

  The storefront can remain static. Checkout would use:

  Public storefront → commerce API → payment provider
  Payment provider → verified webhook → order/payment records

  For example, with Stripe:

  - The browser sends product IDs and quantities—not authoritative prices.
  - The backend validates the shop, calculates prices, discounts, stock, and permitted currency.
  - Guest checkout uses a limited cart/session; customer accounts remain separate from staff accounts.
  - Private orders require ownership checks. Knowing an order ID is not authorization.
  - Payment confirmation comes from verified provider events, not the success-page redirect. Processing must tolerate duplicate events without fulfilling twice. Stripe fulfillment
    guidance

  - Preview uses test payments only. No production payment secrets or customer information go into generated files.

  Cloudflare credentials stay with the deployer. Payment secrets belong wherever payment API calls execute—potentially Convex actions.

  Next, I’d implement trusted runner authentication and immutable artifact promotion before starting checkout. That addresses the biggest gaps in the current publishing boundary
  without adding unnecessary authentication to public pages.
