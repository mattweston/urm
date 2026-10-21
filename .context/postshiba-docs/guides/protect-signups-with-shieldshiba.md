# Protect sign-ups with ShieldShiba

> A free captcha that checks the email address and the browser.

ShieldShiba sits next to the email field on a sign-up or contact form. When a visitor types an address, the widget runs a short proof-of-work in the browser and checks the email, the IP, and the browser. There is no puzzle. A visitor who passes sees **Verified** and the form gets a token. Your server sends that token to PostShiba before it accepts the sign-up.

The token is bound to the email the visitor typed, so a solved check cannot be reused for a different address. Blocked visitors never see the reason. When the block came from their IP, usually a VPN or proxy, the widget asks them to turn off the VPN and try again. Only your server and the ShieldShiba page see the reasons.

PostShiba stores the email's domain and a SHA-256 digest of the address, never the address itself. It also keeps the IP, the user agent, and the verdict.

## Before you start

- A PostShiba account. Open **Security**, then **ShieldShiba**.
- The hostnames that will embed the widget.

## 1. Create a site

On **ShieldShiba**, choose **Add site**. List the hostnames under **Allowed hostnames**. Subdomains of a listed hostname are allowed.

Each site has two keys.

- The **Site key** starts with `ss_pk_`. It is public and goes in your HTML.
- The **Secret key** starts with `ss_sk_`. Keep it on your server. Use **Rotate secret** on the same page if it leaks. The old secret stops working at once.

Two checks are per site.

- **Block hosting networks** is on by default. Turn it off to allow data-center and hosting IPs.
- **Block free email** is off by default. Turn it on if sign-ups should use a work address.

## 2. Embed the widget

Load the script once, then put a `<shield-shiba>` tag inside the form. Point `email-field` at the email input with a CSS selector.

```html signup.html
<script src="https://postshiba.com/shield/v1/widget.js" async></script>

<form action="/signup" method="post">
  <input type="email" name="email" id="email">
  <shield-shiba sitekey="ss_pk_..." email-field="#email"></shield-shiba>
  <button>Sign up</button>
</form>
```

When the visitor passes, the widget adds a hidden input named `shield_shiba_token` to the form. A blocked visitor gets no token.

## 3. Verify the token

Send the token, the email from the submitted form, and your secret key to the verify endpoint. No API key. The email must match the address the visitor typed.

```bash verify.sh
curl -sS \
  --request POST \
  --url "https://app.postshiba.com/shield/v1/verify" \
  --header "Content-Type: application/json" \
  --data '{
    "secret": "ss_sk_...",
    "token": "TOKEN_FROM_FORM",
    "email": "you@example.com"
  }'
```

A valid token returns `200`.

```json verify-response.json
{
  "success": true,
  "verdict": "good_boy",
  "reasons": [],
  "email": "you@example.com",
  "hostname": "example.com",
  "created_at": "2026-09-23T05:12:44Z"
}
```

Accept the sign-up only when `success` is `true` and `verdict` is `good_boy`. Blocked visitors never get a token, so a successful verify always returns `good_boy`. `hostname` is the page the widget ran on. `email` is normalized.

Each token is single-use and valid for 5 minutes. Just before a token expires, the widget clears it and asks the visitor to verify again.

| Status | Body | Meaning |
| --- | --- | --- |
| `401` | `{"success": false, "error": "invalid_secret"}` | The secret key does not belong to the token's site. |
| `422` | `{"success": false, "error": "invalid_token"}` | The token is missing, unknown, already used, expired, or bound to a different email. |

Treat any error as a failed check. Ask the visitor to try again. The account labels these verdicts **Passed** and **Blocked**.

## Reasons

The inspector stops at the first failing check. That reason is stored on the blocked row in the account.

| Reason | Meaning |
| --- | --- |
| `invalid_email` | The address is not well formed. |
| `no_mx` | The domain has no mail server. |
| `temp_email` | The domain is a disposable or temporary inbox. |
| `sfs_domain` | The domain is on the StopForumSpam blocklist. |
| `free_email` | The domain is free webmail. Only when **Block free email** is on. |
| `network_bounced` | The address hard-bounced or was reported as spam with more than one PostShiba sender. |
| `machine_agent` | The browser looks scripted. Headless tools, curl, webdriver, or a form filled in under 300 ms. |
| `sfs_ip` | The IP is on the StopForumSpam blocklist. |
| `abuseipdb_listed` | The IP has an AbuseIPDB confidence score of 50 or higher. |
| `tor` | The IP is a Tor exit node. |
| `hosting_ip` | The IP belongs to a data center or hosting network. Only when **Block hosting networks** is on. |

Do not show these strings to the visitor. For `sfs_ip`, `abuseipdb_listed`, `tor`, and `hosting_ip`, the widget already tells the visitor to turn off their VPN and try again.

## Check the token in Rails

Read the token from the form params and call verify before you create the user.

```ruby app/controllers/registrations_controller.rb
require "net/http"

class RegistrationsController < ApplicationController
  SHIELD_VERIFY_URL = URI("https://app.postshiba.com/shield/v1/verify")

  def create
    email = params.require(:email)
    unless shield_passed?(email, params[:shield_shiba_token])
      flash.now[:alert] = "Please try again."
      return render :new, status: :unprocessable_entity
    end

    User.create!(email: email)
    redirect_to root_path
  end

  private

  def shield_passed?(email, token)
    return false if token.blank?

    response = Net::HTTP.post(
      SHIELD_VERIFY_URL,
      {secret: ENV.fetch("SHIELD_SHIBA_SECRET"), token: token, email: email}.to_json,
      "Content-Type" => "application/json"
    )
    body = JSON.parse(response.body)
    response.is_a?(Net::HTTPOK) && body["success"] && body["verdict"] == "good_boy"
  rescue JSON::ParserError, Net::OpenTimeout, Net::ReadTimeout
    false
  end
end
```

Log `reasons` on a failure if you want to see why a sign-up was blocked.

## Next steps

- [ShieldShiba](/docs/api-reference/shield)
- [How to set the email firewall](/docs/dashboard/emails/email-firewall)
- [How to manage suppressions](/docs/dashboard/emails/email-suppressions)
