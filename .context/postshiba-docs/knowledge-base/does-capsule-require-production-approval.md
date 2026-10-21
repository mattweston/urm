# Does PostShiba require production approval?

> Yes. You can create one shared cluster and inboxes while pending. Sending to anyone else is kyc_required until approval.

Yes. Every team starts pending, and we approve it before it can send to external recipients. While you wait, you can build and test everything with your own team.

After we approve a team you created or asked us to review, new teams you create start approved. Being invited to someone else's approved team does not count.

## What works while you wait

| Action | Pending | Approved |
| --- | --- | --- |
| Create your first cluster | Yes | Yes |
| Create more clusters | No, `kyc_required` | Yes |
| Create inboxes and receive mail | Yes | Yes |
| Send to your own team | Yes | Yes |
| Send to anyone else | No, `kyc_required` | Yes |

"Your own team" means these addresses:

- The email address of each person on the team.
- The address of each live inbox on the team.
- The forward-to address of each live inbox.

A send to any other address returns `403` with `{"error": "kyc_required"}`. The same rule applies to the REST API, the dashboard, and SMTP. SMTP AUTH still succeeds while you are pending. The recipient check happens after it.

If we reject a team, it keeps its clusters, domains, and inboxes, and it can still create one cluster if it has none. It cannot send outbound mail, including to its own team.

## Request approval

1. [Request an invite](/platforms). Opening the sign-up form alone does not give you an account.
2. Sign up from the invitation and add a payment method.
3. Create your first cluster. The first cluster includes a 7-day free trial.
4. Click **Request approval** on the yellow banner at the top of the dashboard.
5. Tell us how you plan to use PostShiba and click **Send request**.

The banner then shows **Request sent**. We review each account by hand, so there is no fixed approval time. The free trial and production approval are separate. An invitation does not approve sending to external recipients.

## Next steps

- [Clusters](/docs/dashboard/clusters/introduction)
- [Receiving emails](/docs/dashboard/receiving/introduction)
- [Errors](/docs/api-reference/errors)
- [Why did sending stop?](/docs/support/why-did-sending-stop)
