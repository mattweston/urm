# ShieldShiba

> Bot checks for signup and contact forms.

Bot checks for your signup and contact forms. Each site has a public site key for the widget and a secret key for your server. secret_key is returned on create, show, and rotate_secret, not on index or update. allowed_hostnames also takes a comma or space separated string. Subdomains of an allowed hostname pass. block_hosting blocks traffic from hosting and datacenter networks. block_free_email blocks free mailbox providers. verifications_7d counts passed and blocked checks over the last 7 days. Redeem a widget token from your server with POST /shield/v1/verify.

## GET /api/v1/teams/:obfuscated_team_id/shield_sites

List sites. secret_key is omitted.

```bash request.sh
curl -sS -X GET \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/shield_sites
```

```json response.json
[
  {
    "id": "ShLdSt",
    "name": "Signup",
    "public_key": "ss_pk_7Fm2Qx9Lt4Wd8Nc1Hv6Bs3Kz",
    "allowed_hostnames": [
      "acme.com",
      "app.acme.com"
    ],
    "block_hosting": true,
    "block_free_email": false,
    "verifications_7d": {
      "passed": 128,
      "blocked": 9
    },
    "created_at": "2026-09-23T00:00:00Z"
  }
]
```

## GET /api/v1/shield_sites/:id

Get one site, including the secret key.

- `id`: Public site id

```bash request.sh
curl -sS -X GET \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/shield_sites/:shield_site_id
```

```json response.json
{
  "id": "ShLdSt",
  "name": "Signup",
  "public_key": "ss_pk_7Fm2Qx9Lt4Wd8Nc1Hv6Bs3Kz",
  "allowed_hostnames": [
    "acme.com",
    "app.acme.com"
  ],
  "block_hosting": true,
  "block_free_email": false,
  "verifications_7d": {
    "passed": 128,
    "blocked": 9
  },
  "created_at": "2026-09-23T00:00:00Z",
  "secret_key": "ss_sk_2w9Qh4Lk8Xz1Vn6Rb3Tm7Pc5"
}
```

## POST /api/v1/teams/:obfuscated_team_id/shield_sites

Create a site. Returns the public and secret keys.

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"shield_site":{"name":"Signup","allowed_hostnames":"acme.com, app.acme.com","block_hosting":true,"block_free_email":false}}' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/shield_sites
```

```json response.json
{
  "id": "ShLdSt",
  "name": "Signup",
  "public_key": "ss_pk_7Fm2Qx9Lt4Wd8Nc1Hv6Bs3Kz",
  "allowed_hostnames": [
    "acme.com",
    "app.acme.com"
  ],
  "block_hosting": true,
  "block_free_email": false,
  "verifications_7d": {
    "passed": 128,
    "blocked": 9
  },
  "created_at": "2026-09-23T00:00:00Z",
  "secret_key": "ss_sk_2w9Qh4Lk8Xz1Vn6Rb3Tm7Pc5"
}
```

## PATCH /api/v1/shield_sites/:id

Update name, allowed_hostnames, block_hosting, or block_free_email. secret_key is omitted.

- `id`: Public site id

```bash request.sh
curl -sS -X PATCH \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"shield_site":{"block_free_email":true}}' \
  https://app.postshiba.com/api/v1/shield_sites/:shield_site_id
```

```json response.json
{
  "id": "ShLdSt",
  "name": "Signup",
  "public_key": "ss_pk_7Fm2Qx9Lt4Wd8Nc1Hv6Bs3Kz",
  "allowed_hostnames": [
    "acme.com",
    "app.acme.com"
  ],
  "block_hosting": true,
  "block_free_email": true,
  "verifications_7d": {
    "passed": 128,
    "blocked": 9
  },
  "created_at": "2026-09-23T00:00:00Z"
}
```

## POST /api/v1/shield_sites/:id/rotate_secret

Issue a new secret key. The old one stops working at once. The site key is unchanged.

- `id`: Public site id

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  https://app.postshiba.com/api/v1/shield_sites/:shield_site_id/rotate_secret
```

```json response.json
{
  "id": "ShLdSt",
  "name": "Signup",
  "public_key": "ss_pk_7Fm2Qx9Lt4Wd8Nc1Hv6Bs3Kz",
  "allowed_hostnames": [
    "acme.com",
    "app.acme.com"
  ],
  "block_hosting": true,
  "block_free_email": false,
  "verifications_7d": {
    "passed": 128,
    "blocked": 9
  },
  "created_at": "2026-09-23T00:00:00Z",
  "secret_key": "ss_sk_8Jd3Ns5Wq1Yf7Kt2Gx9Hr4Lb"
}
```

## DELETE /api/v1/shield_sites/:id

Delete a site. Widgets using its site key stop passing.

- `id`: Public site id

```bash request.sh
curl -sS -X DELETE \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/shield_sites/:shield_site_id
```

## POST https://app.postshiba.com/shield/v1/verify

Redeem a widget token from your server. No API key. Send the site's secret key, the token, and optionally the email the visitor typed. A token redeems once and expires after 5 minutes. 401 invalid_secret. 422 invalid_token.

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"secret":"ss_sk_2w9Qh4Lk8Xz1Vn6Rb3Tm7Pc5","token":"widget-token","email":"jane@acme.com"}' \
  https://app.postshiba.com/shield/v1/verify
```

```json response.json
{
  "success": true,
  "verdict": "good_boy",
  "reasons": [],
  "email": "jane@acme.com",
  "hostname": "acme.com",
  "created_at": "2026-09-23T00:00:00Z"
}
```
