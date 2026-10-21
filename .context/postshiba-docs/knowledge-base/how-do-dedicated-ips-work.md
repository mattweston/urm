# How do dedicated IPs work?

> Exclusive same-class proxy IPs you pick from Network.

A dedicated IP is a sending address only your team can use. You add it from **Network** for $50 a month, then assign it to one or more of your clusters. Clusters themselves are always created on shared IPs.

## What you get

- **Exclusive use.** No other team sends on the address.
- **The same class as the cluster.** A transactional cluster takes a transactional IP, and a bulk cluster takes a bulk IP. A cluster's class is set when you create it and cannot change.
- **Reuse across clusters.** You can assign one dedicated IP to several of your clusters of the same class.
- **One per cluster.** A cluster holds at most one dedicated IP at a time.
- **A visible address.** Shared addresses you do not use show the last number as `x`. Addresses you own or send on are shown in full.

## Add and assign a dedicated IP

1. Open a cluster and click **+** on **Sending IPs**, or open **Network** and click **Add IP**.
2. Pick the cluster. The list shows only IPs of that cluster's class. Pick **Leave unassigned** to buy a dedicated IP without a cluster.
3. Pick the IP.
4. Choose the send split. By default the existing IPs keep 90% and the new IP gets 10%. You can set a custom split that adds up to 100.

Only a Team Administrator can change Network.

## Send one message from a specific IP

The send split spreads a cluster's mail across its IPs. To send one message from a specific IP, add a header such as `X-Capsule-Ip: 203.0.113.10`. It works on SMTP, HTTP inject, and the `headers` object of `POST /emails` and `POST /sends`.

The IP must be one of that cluster's sending IPs. Any other address is rejected, with `550` on SMTP. The header is removed before the message leaves.

## Pricing

| Item | Price |
| --- | --- |
| Shared IP included with each cluster | Included |
| Extra shared IP | $15 a month |
| Dedicated IP | $50 a month while your team owns it, assigned or not |

## Stop using a dedicated IP

- **Unassign** takes the IP off one cluster. You still own it and are still billed.
- **Cancel** returns the IP to inventory and stops the bill. You cannot cancel an IP that is the only sending IP on one of your clusters.

## Next steps

- [Clusters](/docs/dashboard/clusters/introduction)
- [Network API](/docs/api-reference/network)
- [Clusters API](/docs/api-reference/clusters)
