# Network

> Available and owned sending IPs.

List the sending IPs you can buy and the ones you own, then add one to a cluster of the same class. Extra shared IPs are $15 a month. Dedicated IPs are $50 a month and used only by your team. One dedicated IP can serve several of your clusters of the same class. Shared addresses hide the last octet until they are assigned to one of your clusters. Dedicated addresses you own show in full. Paid adds return 403 {error: payment_required} when the team has no payment method. The errors match the Network page in the dashboard.

## GET /api/v1/teams/:obfuscated_team_id/network

List available and owned sending IPs. Optional classification or cluster_id filters to that class.

- `classification`: transactional or bulk
- `cluster_id`: Public cluster id. Filters to that cluster's class.

```bash request.sh
curl -sS -X GET \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/network
```

```json response.json
[
  {
    "id": "IpQwEr",
    "address": "203.0.113.x",
    "status": "active",
    "kind": "shared",
    "classification": "transactional",
    "provider": "aws",
    "owned": false,
    "available": true,
    "cluster_ids": [],
    "feedback_loops": []
  }
]
```

## POST /api/v1/teams/:obfuscated_team_id/network

Buy or assign the chosen IP. Shared IPs require cluster_id. A dedicated IP may stay unassigned. If the cluster still sends on an IP of the other class, the new IP replaces it and takes its whole share. Paid adds return 403 {error: payment_required} when the team has no payment method. Returns 422 sku_unprovisioned when that IP product has no price yet, and 422 empty_inventory, class_mismatch, cluster_required, already_claimed, or weights. See Errors for each.

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"ip_address_id":"IpQwEr","cluster_id":"NmQpXr"}' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/network
```

```json response.json
{
  "id": "IpQwEr",
  "address": "203.0.113.x",
  "status": "active",
  "kind": "shared",
  "classification": "transactional",
  "provider": "aws",
  "owned": false,
  "available": false,
  "cluster_ids": [
    "NmQpXr"
  ],
  "feedback_loops": []
}
```

## POST /api/v1/teams/:obfuscated_team_id/network/assign

Assign an owned dedicated IP to a same-class cluster. The IP can already sit on another of the team's same-class clusters. Returns 422 dedicated_taken when that cluster already has a dedicated IP.

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"ip_address_id":"IpQwEr","cluster_id":"NmQpXr"}' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/network/assign
```

```json response.json
{
  "id": "IpQwEr",
  "address": "198.51.100.10",
  "status": "active",
  "kind": "dedicated",
  "classification": "transactional",
  "provider": "aws",
  "owned": true,
  "available": false,
  "cluster_ids": [
    "NmQpXr"
  ],
  "feedback_loops": []
}
```

## POST /api/v1/teams/:obfuscated_team_id/network/unassign

Remove an IP from a cluster. Returns 422 last_ip when it is the cluster's only sending IP.

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"ip_address_id":"IpQwEr","cluster_id":"NmQpXr"}' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/network/unassign
```

```json response.json
{
  "id": "IpQwEr",
  "address": "203.0.113.x",
  "status": "active",
  "kind": "shared",
  "classification": "transactional",
  "provider": "aws",
  "owned": false,
  "available": true,
  "cluster_ids": [],
  "feedback_loops": []
}
```

## POST /api/v1/teams/:obfuscated_team_id/network/switch

Replace the included shared IP with another same-class shared IP. Free. No card required.

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"ip_address_id":"IpQwEr","cluster_id":"NmQpXr"}' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/network/switch
```

```json response.json
{
  "id": "IpQwEr",
  "address": "203.0.113.x",
  "status": "active",
  "kind": "shared",
  "classification": "transactional",
  "provider": "aws",
  "owned": false,
  "available": false,
  "cluster_ids": [
    "NmQpXr"
  ],
  "feedback_loops": []
}
```

## POST /api/v1/teams/:obfuscated_team_id/network/release

Return an owned dedicated IP to inventory and stop the bill. Returns 422 last_ip when a cluster still has only that IP.

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"ip_address_id":"IpQwEr"}' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/network/release
```

```json response.json
{
  "id": "IpQwEr",
  "address": "198.51.100.x",
  "status": "active",
  "kind": "dedicated",
  "classification": "transactional",
  "provider": "aws",
  "owned": false,
  "available": true,
  "cluster_ids": [],
  "feedback_loops": []
}
```
