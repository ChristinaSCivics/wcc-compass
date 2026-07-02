#!/bin/bash
# One-shot: point Supabase auth at the production site + branded magic-link email.
# Reads your Supabase CLI token from the macOS keychain (may show an Allow prompt).
set -euo pipefail

TOK="$(security find-generic-password -s 'Supabase CLI' -w)"

read -r -d '' BODY <<'EOF' || true
{
  "site_url": "https://wcc-compass-livid.vercel.app",
  "uri_allow_list": "https://wcc-compass-livid.vercel.app/**,http://localhost:3000/**",
  "mailer_autoconfirm": true,
  "external_anonymous_users_enabled": true,
  "mailer_subjects_magic_link": "Your door into the Compass",
  "mailer_templates_magic_link_content": "<div style=\"background:#0b0a08;padding:48px 24px;font-family:Georgia,serif\"><div style=\"max-width:480px;margin:0 auto;text-align:center\"><div style=\"color:#d4a24e;font-size:28px;letter-spacing:2px\">&#9670;</div><h1 style=\"color:#f2ece0;font-weight:400;font-size:26px;margin:24px 0 8px\">The Compass</h1><p style=\"color:#9c9284;font-size:13px;letter-spacing:3px;text-transform:uppercase;margin:0 0 32px\">World Co-Creation</p><p style=\"color:#f2ece0;font-size:16px;line-height:1.6;margin:0 0 32px\">Welcome. The conversation about the world we actually want is waiting for you.</p><a href=\"{{ .ConfirmationURL }}\" style=\"display:inline-block;border:1px solid #d4a24e;color:#d4a24e;text-decoration:none;padding:14px 36px;border-radius:999px;font-size:16px\">Enter the Compass &rarr;</a><p style=\"color:#9c9284;font-size:12px;line-height:1.6;margin:40px 0 0\">This link signs you in securely &mdash; no password needed. It expires in one hour. If you didn&rsquo;t request it, you can safely ignore this email.</p></div></div>"
}
EOF

curl -s -X PATCH "https://api.supabase.com/v1/projects/raenzyexvyhoqrnncawr/config/auth" \
  -H "Authorization: Bearer $TOK" \
  -H "Content-Type: application/json" \
  -d "$BODY" -o /dev/null -w "Auth config updated: HTTP %{http_code}\n"
