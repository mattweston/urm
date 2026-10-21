# Why did sending stop?

> Run this checklist in order when a customer says mail is not going out.

Work down this list and stop at the first item that matches. Most causes show up as a colored banner at the top of the dashboard, and each one comes with a sentence you can pass on.

## 1. Red banner: the account is suspended

The banner says the account is suspended and outbound sending is blocked. Nothing on the team can send.

What to say: "Sending is paused on our account. We have contacted PostShiba support to resolve it."

Next step: open a support ticket. See [How to reach us](/docs/support/how-to-reach-us).

## 2. Yellow banner: the account is waiting for approval

The banner says the account can only send to its own email until it is approved. Mail to customers is refused with `kyc_required`.

What to say: "Our account is still being approved, so we cannot send to customers yet."

Next step: anyone on the team can click **Request approval** on the banner. If the banner shows **Request sent**, the request is already being reviewed. See [Does PostShiba require production approval?](/docs/knowledge-base/does-capsule-require-production-approval).

## 3. Red banner: one tenant is paused

The banner names a tenant and says its sending is paused by our abuse team. Other tenants on the team can still send.

What to say: "Sending for this account is paused while we work with PostShiba to resolve it."

Next step: click **Open a support ticket** on the banner.

## 4. A tenant or cluster your team paused

A Team Administrator can pause a tenant or a cluster themselves. There is no banner for this. The tenant or cluster page shows it as suspended, and its mail is refused.

Next step: ask a Team Administrator whether the pause was intended, and to resume it if not.

## 5. The sending domain is suspended

Open **Domains** and check the domain in the customer's `from` address. A suspended domain refuses every send with `domain_suspended`.

Next step: a Team Administrator resumes the domain. If resuming fails with `dbl_listed`, the domain is on the Spamhaus Domain Block List and must be cleared there first. See [Managing domains](/docs/dashboard/domains/manage-domains).

## 6. Amber banner: the cluster reached its limit

The banner names the cluster, its hourly limit, and how many messages are scheduled and ready. Mail sent over SMTP waits and goes out when capacity opens. Mail sent with the API or HTTP inject is refused with `throttled` until then.

What to say: "We reached our sending limit for the hour. Mail will go out when capacity opens."

Next step: a Team Administrator can click **Change plan** on the banner. If capacity boosts are turned on for your account, the banner also shows **Boost**. See [What happens at your cap](/docs/dashboard/clusters/what-happens-at-your-cap).

## 7. None of the above

Look up the customer's address from the search box in the top bar. The problem may be that one address, not the whole account. See [Did they get the email?](/docs/support/did-they-get-the-email).

The **Events** page repeats the tenant pause and cluster limit notices above its table, so you can check there too.

## Who can fix what

Everyone on the team can see the banners, **Events**, and recipient lookup, and anyone can request approval or open a support ticket. Only a Team Administrator can resume a domain, tenant, or cluster, change a plan, or buy a boost.

## Next steps

- [Did they get the email?](/docs/support/did-they-get-the-email)
- [How to reach us](/docs/support/how-to-reach-us)
- [What happens at your cap](/docs/dashboard/clusters/what-happens-at-your-cap)
