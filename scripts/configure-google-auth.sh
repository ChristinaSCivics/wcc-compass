#!/bin/bash
# One-shot: switch on "Continue with Google" in Supabase auth.
#   - Google provider on, with the OAuth client from Google Cloud
#   - manual linking on, so Google can attach to an anonymous spot (linkIdentity)
#   - demo.worldcocreation.com allowed as a redirect target
# Asks for the Google client ID and secret; the secret is never echoed.
# Reads your Supabase CLI token from the macOS keychain (may show an Allow prompt).
set -euo pipefail

TOK="$(security find-generic-password -s 'Supabase CLI' -w)"

read -r -p "Google client ID: " CLIENT_ID
read -r -s -p "Google client secret: " CLIENT_SECRET
echo

BODY="$(CLIENT_ID="$CLIENT_ID" CLIENT_SECRET="$CLIENT_SECRET" python3 -c '
import json, os
print(json.dumps({
  "external_google_enabled": True,
  "external_google_client_id": os.environ["CLIENT_ID"].strip(),
  "external_google_secret": os.environ["CLIENT_SECRET"].strip(),
  "security_manual_linking_enabled": True,
  "uri_allow_list": "https://wcc-compass-livid.vercel.app/**,https://demo.worldcocreation.com/**,http://localhost:3000/**",
}))')"

curl -s -X PATCH "https://api.supabase.com/v1/projects/raenzyexvyhoqrnncawr/config/auth" \
  -H "Authorization: Bearer $TOK" \
  -H "Content-Type: application/json" \
  -d "$BODY" -o /dev/null -w "Auth config updated: HTTP %{http_code}\n"
