# Connect MCP

> Set up and query PostShiba from Cursor with the same API key you use for REST.

PostShiba runs an MCP server over streamable HTTP at `https://app.postshiba.com/mcp`. Every tool maps to a documented REST endpoint, with the same permissions and send gates, so an assistant can create clusters, add domains, and check delivery for you.

## Before you start

You need a Full access or Support key. See [Create an API key](/docs/create-an-api-key).

## Add the server to Cursor

1. Open your MCP config. Use `~/.cursor/mcp.json` for every project, or `.cursor/mcp.json` inside one project.
2. Add the `postshiba` server and replace `YOUR_API_KEY` with your key.
3. Save. Cursor lists the PostShiba tools when the server connects.

```json mcp.json
{
  "mcpServers": {
    "postshiba": {
      "url": "https://app.postshiba.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

The **AI** page in the dashboard shows this config for each agent. Right after you create a key there, it fills the key in.

## Other agents

Your API key is the Bearer token. Every client sends it as `Authorization: Bearer YOUR_API_KEY`.

Claude Code, from your project folder:

```bash claude-code.sh
claude mcp add --transport http postshiba https://app.postshiba.com/mcp --header "Authorization: Bearer YOUR_API_KEY"
```

Codex reads the key from an environment variable, so it stays out of the file. Add this to `~/.codex/config.toml`, then run `export POSTSHIBA_API_KEY=YOUR_API_KEY` in your shell profile.

```toml config.toml
[mcp_servers.postshiba]
url = "https://app.postshiba.com/mcp"
bearer_token_env_var = "POSTSHIBA_API_KEY"
```

Windsurf uses `serverUrl` in `mcp_config.json`:

```json mcp_config.json
{
  "mcpServers": {
    "postshiba": {
      "serverUrl": "https://app.postshiba.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

Any other client that supports Streamable HTTP with custom headers works with the same URL and header.

The key must go in the `Authorization` header. A token in the query string is rejected. Use `app.postshiba.com`, not `postshiba.com`.

## What the tools can do

| Key | Tools |
| --- | --- |
| Full access | Every `/api/v1` endpoint in the [REST API](/docs/api-reference/introduction), such as `create_cluster`, `create_sending_domain`, `send_email`, and `list_team_message_events`. |
| Support | Five tools: `whoami`, `lookup_recipient`, `get_analytics`, `get_status`, and `destroy_suppression`. See [Ask your assistant](/docs/support/ask-your-assistant). |

The team comes from the key, so tools never take a team id. MCP requests are limited to 600 per minute per key.

Send gates match REST. While your account is pending production approval, sends go only to team member emails, live inbox addresses, and inbox forward-to addresses. Anything else returns `403` `kyc_required`. See [Does PostShiba require production approval?](/docs/knowledge-base/does-capsule-require-production-approval)

## Secrets stay out of tool results

MCP removes secrets from every response: webhook signing secrets, inbox `webhook_secret`, DKIM private keys, and SMTP passwords. Copy those from the dashboard.

The one exception is `create_smtp_credential`, which returns the new password once. Cluster create issues a default SMTP user but hides its password, so call `create_smtp_credential` when the assistant needs one.

## Prompts to try

Paste one of these into Cursor after the server connects. The dashboard's **AI** page has the same prompts.

```text first-send.txt
I've signed up to PostShiba and have set up my first cluster. Could you help me get set up for our first send? Set up our sending domain, get SMTP credentials, and work out how to get our app configured to use it. Also help me with adding the DNS records or telling me what to do whilst you work on the code
```

```text create-cluster.txt
Create a shared-IP cluster for this team. Name it after the team. A pending team can create one. If create_cluster returns 403 kyc_required, the team already has a cluster and needs approval for another. KYC is not an MCP action. If it returns payment_required, stop. Poll get_cluster until sending_ready is true before you send. Until the team is approved, send only to team member emails, live inbox addresses, and inbox forward-to addresses. Anything else is 403 kyc_required.
```

```text create-credentials.txt
Create an SMTP credential on the cluster with create_smtp_credential so the password appears once. Cluster create already issues a default user and hides the password. Do not try to send over SMTP through MCP.
```

```text send-test-email.txt
Send a sandbox message with send_on_cluster and sandbox true. Do not use send_email for a sandbox send. A live send needs sending_ready, a verified From domain, and a live credential. MCP cannot set Idempotency-Key. Never use the whoami email as From. Omit from or use a verified sending domain.
```

```text create-mailbox.txt
Create an inbox with create_inbox. Omit host and sending_domain_id for a hosted address. For a domain-bound address, set local_part and host to one of your sending domains or a subdomain of it; sending_domain_id is inferred from host. The domain may still be waiting on DNS. The inbox starts receiving once it verifies, so ask me to publish the MX record together with DKIM and return-path. Inbox create is open while KYC is pending. MCP redacts webhook_secret. Copy signing secrets from the dashboard inbox page, not from MCP.
```

```text import-dkim.txt
Import an existing DKIM private key for a sending domain that is migrating to us. Use create_sending_domain or update_sending_domain with dkim_manual true, the current selector, and the RSA PEM in dkim_private_key. MCP redacts private keys in responses. I will publish a TXT at {selector}._domainkey.{domain} matching dkim_txt, not a CNAME. Then call verify_sending_domain. Refreshing keys with refresh_sending_domain breaks authentication and sending until I publish the new TXT.
```

```text send-from-domain.txt
Send from an address on a verified sending domain, not from the hosted inbox. Call create_sending_domain. For a new domain, wait while I publish the DKIM and return-path CNAMEs, then call verify_sending_domain. To bring an existing key, set dkim_manual true and dkim_private_key to the PEM, publish the TXT yourself, then verify. MAIL FROM cannot be an inbound.postshiba.com address. Never use the whoami email as From. Omit from or use a verified sending domain.
```

## Next steps

- [Ask your assistant](/docs/support/ask-your-assistant)
- [Create a Support key](/docs/support/create-a-support-key)
- [Add and verify a domain](/docs/add-a-domain)
- [Send basic transactional emails with PostShiba](/docs/guides/send-transactional-email)
