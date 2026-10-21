# Clusters

> Shared-IP sending environments.

A cluster is a shared-IP sending environment with its own capacity plan. Choose classification transactional or bulk when you create it. It can't change later. Create assigns a shared IP of that class and returns 422 when none is available. A team pending approval can create one cluster. A second returns 403 {error: kyc_required} until the team is approved. Send on smtp_endpoint (port 587) or http_endpoint (POST /api/inject/v1) with an SMTP username and password. emails_per_hour and emails_per_day are the current hourly throttle and 24-hour cap. base_emails_per_hour and base_emails_per_day are the monthly plan. boost appears when a boost is active or scheduled. Inbound receiving always uses the monthly plan. Deleting a cluster deprovisions it and disables its SMTP credentials. Its domains are not affected.

## GET /api/v1/teams/:obfuscated_team_id/clusters

List live clusters for the token's team. Excludes deprovisioned.

```bash request.sh
curl -sS -X GET \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/clusters
```

```json response.json
[
  {
    "id": "NmQpXr",
    "name": "edge",
    "region": "manual",
    "size": "small",
    "plan": "nano",
    "emails_per_hour": 100,
    "emails_per_day": 600,
    "base_emails_per_hour": 100,
    "base_emails_per_day": 600,
    "boost": null,
    "auto_boost": {
      "sku": null,
      "monthly_limit": 3,
      "used_this_month": 0
    },
    "ip_assignment": "shared",
    "desired_status": "active",
    "status": "active",
    "smtp_endpoint": "smtp.capsule.test:587",
    "http_endpoint": "smtp.capsule.test:8000",
    "classification": "transactional",
    "assigned_ip": {
      "address": "203.0.113.2",
      "status": "active"
    },
    "sending_ips": [
      {
        "address": "203.0.113.2",
        "status": "active",
        "kind": "shared",
        "classification": "transactional",
        "weight": 100,
        "provider": null
      }
    ],
    "sending_ready": true,
    "refused_sends": [
      {
        "smtp_username": "smtp_a1b2c3d4e5f6a7b8",
        "reason": "unavailable",
        "count": 412,
        "first_at": "2026-09-27T14:02:10Z",
        "last_at": "2026-09-27T14:16:03Z"
      }
    ]
  }
]
```

## GET /api/v1/clusters/:id

Get one cluster, including computed status, SMTP, HTTP inject, and refused sends from the last 7 days.

- `id`: Public cluster id

```bash request.sh
curl -sS -X GET \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/clusters/:obfuscated_cluster_id
```

```json response.json
{
  "id": "NmQpXr",
  "name": "edge",
  "region": "manual",
  "size": "small",
  "plan": "nano",
  "emails_per_hour": 100,
  "emails_per_day": 600,
  "base_emails_per_hour": 100,
  "base_emails_per_day": 600,
  "boost": null,
  "auto_boost": {
    "sku": null,
    "monthly_limit": 3,
    "used_this_month": 0
  },
  "ip_assignment": "shared",
  "desired_status": "active",
  "status": "active",
  "smtp_endpoint": "smtp.capsule.test:587",
  "http_endpoint": "smtp.capsule.test:8000",
  "classification": "transactional",
  "assigned_ip": {
    "address": "203.0.113.2",
    "status": "active"
  },
  "sending_ips": [
    {
      "address": "203.0.113.2",
      "status": "active",
      "kind": "shared",
      "classification": "transactional",
      "weight": 100,
      "provider": null
    }
  ],
  "sending_ready": true,
  "refused_sends": [
    {
      "smtp_username": "smtp_a1b2c3d4e5f6a7b8",
      "reason": "unavailable",
      "count": 412,
      "first_at": "2026-09-27T14:02:10Z",
      "last_at": "2026-09-27T14:16:03Z"
    }
  ]
}
```

## POST /api/v1/teams/:obfuscated_team_id/clusters

Create a shared-IP cluster. classification is transactional or bulk and can't change later. Create also issues a default SMTP user, whose password is not in the response. Call SMTP credentials create for a password you can use. A pending team can create one. A second cluster returns 403 {error: kyc_required} until the team is approved. Returns 403 {error: payment_required} when the team has no payment method. Returns 422 when no shared IP of that class is available. During beta, plan must be nano, micro, small, medium, or large.

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"cluster":{"name":"edge","size":"small","region":"manual","plan":"nano","classification":"transactional"}}' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/clusters
```

```json response.json
{
  "id": "NmQpXr",
  "name": "edge",
  "region": "manual",
  "size": "small",
  "plan": "nano",
  "emails_per_hour": 100,
  "emails_per_day": 600,
  "base_emails_per_hour": 100,
  "base_emails_per_day": 600,
  "boost": null,
  "auto_boost": {
    "sku": null,
    "monthly_limit": 3,
    "used_this_month": 0
  },
  "ip_assignment": "shared",
  "desired_status": "active",
  "status": "active",
  "smtp_endpoint": "smtp.capsule.test:587",
  "http_endpoint": "smtp.capsule.test:8000",
  "classification": "transactional",
  "assigned_ip": {
    "address": "203.0.113.2",
    "status": "active"
  },
  "sending_ips": [
    {
      "address": "203.0.113.2",
      "status": "active",
      "kind": "shared",
      "classification": "transactional",
      "weight": 100,
      "provider": null
    }
  ],
  "sending_ready": true,
  "refused_sends": [
    {
      "smtp_username": "smtp_a1b2c3d4e5f6a7b8",
      "reason": "unavailable",
      "count": 412,
      "first_at": "2026-09-27T14:02:10Z",
      "last_at": "2026-09-27T14:16:03Z"
    }
  ]
}
```

## PATCH /api/v1/clusters/:id

Update name, region, size, or plan. classification is not accepted. Changing plan updates the hourly throttle and 24-hour cap immediately. Plan changes return 422 while a capacity boost is active or scheduled. During beta, plan must be nano, micro, small, medium, or large. Returns 422 {error: archived} if the cluster is deprovisioned. Changing plan or size returns 403 {error: payment_required} when the team has no payment method.

- `id`: Public cluster id

```bash request.sh
curl -sS -X PATCH \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"cluster":{"plan":"micro"}}' \
  https://app.postshiba.com/api/v1/clusters/:obfuscated_cluster_id
```

```json response.json
{
  "id": "NmQpXr",
  "name": "edge",
  "region": "manual",
  "size": "small",
  "plan": "micro",
  "emails_per_hour": 4000,
  "emails_per_day": 24000,
  "base_emails_per_hour": 4000,
  "base_emails_per_day": 24000,
  "boost": null,
  "auto_boost": {
    "sku": null,
    "monthly_limit": 3,
    "used_this_month": 0
  },
  "ip_assignment": "shared",
  "desired_status": "active",
  "status": "active",
  "smtp_endpoint": "smtp.capsule.test:587",
  "http_endpoint": "smtp.capsule.test:8000",
  "classification": "transactional",
  "assigned_ip": {
    "address": "203.0.113.2",
    "status": "active"
  },
  "sending_ips": [
    {
      "address": "203.0.113.2",
      "status": "active",
      "kind": "shared",
      "classification": "transactional",
      "weight": 100,
      "provider": null
    }
  ],
  "sending_ready": true,
  "refused_sends": [
    {
      "smtp_username": "smtp_a1b2c3d4e5f6a7b8",
      "reason": "unavailable",
      "count": 412,
      "first_at": "2026-09-27T14:02:10Z",
      "last_at": "2026-09-27T14:16:03Z"
    }
  ]
}
```

## POST /api/v1/clusters/:id/suspend

Pause sending.

- `id`: Public cluster id

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  https://app.postshiba.com/api/v1/clusters/:obfuscated_cluster_id/suspend
```

```json response.json
{
  "id": "NmQpXr",
  "name": "edge",
  "region": "manual",
  "size": "small",
  "plan": "nano",
  "emails_per_hour": 100,
  "emails_per_day": 600,
  "base_emails_per_hour": 100,
  "base_emails_per_day": 600,
  "boost": null,
  "auto_boost": {
    "sku": null,
    "monthly_limit": 3,
    "used_this_month": 0
  },
  "ip_assignment": "shared",
  "desired_status": "suspended",
  "status": "suspended",
  "smtp_endpoint": "smtp.capsule.test:587",
  "http_endpoint": "smtp.capsule.test:8000",
  "classification": "transactional",
  "assigned_ip": {
    "address": "203.0.113.2",
    "status": "active"
  },
  "sending_ips": [
    {
      "address": "203.0.113.2",
      "status": "active",
      "kind": "shared",
      "classification": "transactional",
      "weight": 100,
      "provider": null
    }
  ],
  "sending_ready": false,
  "refused_sends": [
    {
      "smtp_username": "smtp_a1b2c3d4e5f6a7b8",
      "reason": "unavailable",
      "count": 412,
      "first_at": "2026-09-27T14:02:10Z",
      "last_at": "2026-09-27T14:16:03Z"
    }
  ]
}
```

## POST /api/v1/clusters/:id/resume

Resume sending. Returns 422 {error: archived} if the cluster is deprovisioned.

- `id`: Public cluster id

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  https://app.postshiba.com/api/v1/clusters/:obfuscated_cluster_id/resume
```

```json response.json
{
  "id": "NmQpXr",
  "name": "edge",
  "region": "manual",
  "size": "small",
  "plan": "nano",
  "emails_per_hour": 100,
  "emails_per_day": 600,
  "base_emails_per_hour": 100,
  "base_emails_per_day": 600,
  "boost": null,
  "auto_boost": {
    "sku": null,
    "monthly_limit": 3,
    "used_this_month": 0
  },
  "ip_assignment": "shared",
  "desired_status": "active",
  "status": "active",
  "smtp_endpoint": "smtp.capsule.test:587",
  "http_endpoint": "smtp.capsule.test:8000",
  "classification": "transactional",
  "assigned_ip": {
    "address": "203.0.113.2",
    "status": "active"
  },
  "sending_ips": [
    {
      "address": "203.0.113.2",
      "status": "active",
      "kind": "shared",
      "classification": "transactional",
      "weight": 100,
      "provider": null
    }
  ],
  "sending_ready": true,
  "refused_sends": [
    {
      "smtp_username": "smtp_a1b2c3d4e5f6a7b8",
      "reason": "unavailable",
      "count": 412,
      "first_at": "2026-09-27T14:02:10Z",
      "last_at": "2026-09-27T14:16:03Z"
    }
  ]
}
```

## POST /api/v1/clusters/:id/reactivate

Reactivate an archived shared-IP cluster. A pending team can reactivate when it has no live cluster. A second live cluster returns 403 {error: kyc_required} until the team is approved. Returns 403 {error: payment_required} when the team has no payment method. Returns 403 {error: team_suspended} while the account is suspended. Returns 422 {error: dedicated} for a dedicated cluster and 422 {error: not_archived} if the cluster is still live.

- `id`: Public cluster id

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  https://app.postshiba.com/api/v1/clusters/:obfuscated_cluster_id/reactivate
```

```json response.json
{
  "id": "NmQpXr",
  "name": "edge",
  "region": "manual",
  "size": "small",
  "plan": "nano",
  "emails_per_hour": 100,
  "emails_per_day": 600,
  "base_emails_per_hour": 100,
  "base_emails_per_day": 600,
  "boost": null,
  "auto_boost": {
    "sku": null,
    "monthly_limit": 3,
    "used_this_month": 0
  },
  "ip_assignment": "shared",
  "desired_status": "active",
  "status": "active",
  "smtp_endpoint": "smtp.capsule.test:587",
  "http_endpoint": "smtp.capsule.test:8000",
  "classification": "transactional",
  "assigned_ip": {
    "address": "203.0.113.2",
    "status": "active"
  },
  "sending_ips": [
    {
      "address": "203.0.113.2",
      "status": "active",
      "kind": "shared",
      "classification": "transactional",
      "weight": 100,
      "provider": null
    }
  ],
  "sending_ready": true,
  "refused_sends": [
    {
      "smtp_username": "smtp_a1b2c3d4e5f6a7b8",
      "reason": "unavailable",
      "count": 412,
      "first_at": "2026-09-27T14:02:10Z",
      "last_at": "2026-09-27T14:16:03Z"
    }
  ]
}
```

## DELETE /api/v1/clusters/:id

Deprovision the cluster. The record stays with desired_status deprovisioned and drops out of the list. Its SMTP credentials are disabled. Its domains are not affected.

- `id`: Public cluster id

```bash request.sh
curl -sS -X DELETE \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/clusters/:obfuscated_cluster_id
```

```json response.json
{
  "id": "NmQpXr",
  "name": "edge",
  "region": "manual",
  "size": "small",
  "plan": "nano",
  "emails_per_hour": 100,
  "emails_per_day": 600,
  "base_emails_per_hour": 100,
  "base_emails_per_day": 600,
  "boost": null,
  "auto_boost": {
    "sku": null,
    "monthly_limit": 3,
    "used_this_month": 0
  },
  "ip_assignment": "shared",
  "desired_status": "deprovisioned",
  "status": "deprovisioned",
  "smtp_endpoint": "smtp.capsule.test:587",
  "http_endpoint": "smtp.capsule.test:8000",
  "classification": "transactional",
  "assigned_ip": {
    "address": "203.0.113.2",
    "status": "active"
  },
  "sending_ips": [
    {
      "address": "203.0.113.2",
      "status": "active",
      "kind": "shared",
      "classification": "transactional",
      "weight": 100,
      "provider": null
    }
  ],
  "sending_ready": false,
  "refused_sends": [
    {
      "smtp_username": "smtp_a1b2c3d4e5f6a7b8",
      "reason": "unavailable",
      "count": 412,
      "first_at": "2026-09-27T14:02:10Z",
      "last_at": "2026-09-27T14:16:03Z"
    }
  ]
}
```

## POST /api/v1/clusters/:id/boost

Buy a 24-hour outbound capacity boost. The sku sets the price and target capacity. The plan and monthly subscription don't change. Capacity boosts are in limited release. Returns 404 {error: feature_disabled} when they are not enabled. Returns 403 {error: payment_required} when the team has no payment method.

- `id`: Public cluster id

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"sku":"small_to_large","starts_at":null}' \
  https://app.postshiba.com/api/v1/clusters/:obfuscated_cluster_id/boost
```

```json response.json
{
  "id": "NmQpXr",
  "name": "edge",
  "region": "manual",
  "size": "small",
  "plan": "small",
  "emails_per_hour": 200000,
  "emails_per_day": 1200000,
  "base_emails_per_hour": 40000,
  "base_emails_per_day": 240000,
  "boost": {
    "sku": "small_to_large",
    "trigger": "manual",
    "status": "active",
    "target_plan": "large",
    "target_emails_per_hour": 200000,
    "target_emails_per_day": 1200000,
    "starts_at": "2026-09-13T10:00:00Z",
    "ends_at": "2026-09-14T10:00:00Z"
  },
  "auto_boost": {
    "sku": null,
    "monthly_limit": 3,
    "used_this_month": 0
  },
  "ip_assignment": "shared",
  "desired_status": "active",
  "status": "active",
  "smtp_endpoint": "smtp.capsule.test:587",
  "http_endpoint": "smtp.capsule.test:8000",
  "classification": "transactional",
  "assigned_ip": {
    "address": "203.0.113.2",
    "status": "active"
  },
  "sending_ips": [
    {
      "address": "203.0.113.2",
      "status": "active",
      "kind": "shared",
      "classification": "transactional",
      "weight": 100,
      "provider": null
    }
  ],
  "sending_ready": true,
  "refused_sends": [
    {
      "smtp_username": "smtp_a1b2c3d4e5f6a7b8",
      "reason": "unavailable",
      "count": 412,
      "first_at": "2026-09-27T14:02:10Z",
      "last_at": "2026-09-27T14:16:03Z"
    }
  ]
}
```

## POST /api/v1/clusters/:id/extend_boost

Add 24 hours to an active boost at the same target capacity. Scheduled boosts cannot be extended. Pass idempotency_key to retry safely. Returns 403 {error: extensions_disabled} when boost extensions are turned off.

- `id`: Public cluster id

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"idempotency_key":"extend-1"}' \
  https://app.postshiba.com/api/v1/clusters/:obfuscated_cluster_id/extend_boost
```

```json response.json
{
  "id": "NmQpXr",
  "name": "edge",
  "region": "manual",
  "size": "small",
  "plan": "small",
  "emails_per_hour": 200000,
  "emails_per_day": 1200000,
  "base_emails_per_hour": 40000,
  "base_emails_per_day": 240000,
  "boost": {
    "sku": "small_to_large",
    "trigger": "manual",
    "status": "active",
    "target_plan": "large",
    "target_emails_per_hour": 200000,
    "target_emails_per_day": 1200000,
    "starts_at": "2026-09-13T10:00:00Z",
    "ends_at": "2026-09-14T10:00:00Z"
  },
  "auto_boost": {
    "sku": null,
    "monthly_limit": 3,
    "used_this_month": 0
  },
  "ip_assignment": "shared",
  "desired_status": "active",
  "status": "active",
  "smtp_endpoint": "smtp.capsule.test:587",
  "http_endpoint": "smtp.capsule.test:8000",
  "classification": "transactional",
  "assigned_ip": {
    "address": "203.0.113.2",
    "status": "active"
  },
  "sending_ips": [
    {
      "address": "203.0.113.2",
      "status": "active",
      "kind": "shared",
      "classification": "transactional",
      "weight": 100,
      "provider": null
    }
  ],
  "sending_ready": true,
  "refused_sends": [
    {
      "smtp_username": "smtp_a1b2c3d4e5f6a7b8",
      "reason": "unavailable",
      "count": 412,
      "first_at": "2026-09-27T14:02:10Z",
      "last_at": "2026-09-27T14:16:03Z"
    }
  ]
}
```

## POST /api/v1/clusters/:id/cancel_boost

Cancel a scheduled boost that has not started and refund the one-time charge.

- `id`: Public cluster id

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  https://app.postshiba.com/api/v1/clusters/:obfuscated_cluster_id/cancel_boost
```

```json response.json
{
  "id": "NmQpXr",
  "name": "edge",
  "region": "manual",
  "size": "small",
  "plan": "small",
  "emails_per_hour": 40000,
  "emails_per_day": 240000,
  "base_emails_per_hour": 40000,
  "base_emails_per_day": 240000,
  "boost": null,
  "auto_boost": {
    "sku": null,
    "monthly_limit": 3,
    "used_this_month": 0
  },
  "ip_assignment": "shared",
  "desired_status": "active",
  "status": "active",
  "smtp_endpoint": "smtp.capsule.test:587",
  "http_endpoint": "smtp.capsule.test:8000",
  "classification": "transactional",
  "assigned_ip": {
    "address": "203.0.113.2",
    "status": "active"
  },
  "sending_ips": [
    {
      "address": "203.0.113.2",
      "status": "active",
      "kind": "shared",
      "classification": "transactional",
      "weight": 100,
      "provider": null
    }
  ],
  "sending_ready": true,
  "refused_sends": [
    {
      "smtp_username": "smtp_a1b2c3d4e5f6a7b8",
      "reason": "unavailable",
      "count": 412,
      "first_at": "2026-09-27T14:02:10Z",
      "last_at": "2026-09-27T14:16:03Z"
    }
  ]
}
```

## PATCH /api/v1/clusters/:id/auto_boost

Turn auto-boost on or off. With a sku set, when the cluster reaches its hourly or 24-hour limit it boosts itself for 24 hours instead of refusing mail, and the boost's one-time price is charged to the card on file. A blank sku turns it off; leave sku out to change only monthly_limit. monthly_limit (1 to 10, default 3) caps auto-boosts per calendar month (UTC). An auto-boost shows in boost with trigger auto. Auto-boost is in limited release. Returns 404 {error: feature_disabled} when it is not enabled for the team. Returns 403 {error: payment_required} when turning it on without a payment method. Returns 422 {error: invalid} when the sku doesn't match the cluster's plan.

- `id`: Public cluster id

```bash request.sh
curl -sS -X PATCH \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"sku":"small_to_medium","monthly_limit":3}' \
  https://app.postshiba.com/api/v1/clusters/:obfuscated_cluster_id/auto_boost
```

```json response.json
{
  "id": "NmQpXr",
  "name": "edge",
  "region": "manual",
  "size": "small",
  "plan": "small",
  "emails_per_hour": 40000,
  "emails_per_day": 240000,
  "base_emails_per_hour": 40000,
  "base_emails_per_day": 240000,
  "boost": null,
  "auto_boost": {
    "sku": "small_to_medium",
    "monthly_limit": 3,
    "used_this_month": 0
  },
  "ip_assignment": "shared",
  "desired_status": "active",
  "status": "active",
  "smtp_endpoint": "smtp.capsule.test:587",
  "http_endpoint": "smtp.capsule.test:8000",
  "classification": "transactional",
  "assigned_ip": {
    "address": "203.0.113.2",
    "status": "active"
  },
  "sending_ips": [
    {
      "address": "203.0.113.2",
      "status": "active",
      "kind": "shared",
      "classification": "transactional",
      "weight": 100,
      "provider": null
    }
  ],
  "sending_ready": true,
  "refused_sends": [
    {
      "smtp_username": "smtp_a1b2c3d4e5f6a7b8",
      "reason": "unavailable",
      "count": 412,
      "first_at": "2026-09-27T14:02:10Z",
      "last_at": "2026-09-27T14:16:03Z"
    }
  ]
}
```
