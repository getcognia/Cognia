#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000/api}"
CORPUS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RICH_FILES_SCRIPT="${CORPUS_DIR}/generate-rich-files.sh"
STAMP="${STAMP:-$(date +%s)}"
EMAIL="${EMAIL:-competition-demo-${STAMP}@cognia.local}"
PASSWORD="${PASSWORD:-DemoPass2026!}"
ORG_NAME="${ORG_NAME:-Northstar Bank Deal Room Demo}"
ORG_SLUG="${ORG_SLUG:-northstar-bank-demo-${STAMP}}"
DEMO_WEBSITE="${DEMO_WEBSITE:-https://northstarbank.demo}"
DEMO_CITY="${DEMO_CITY:-New York}"
DEMO_STATE="${DEMO_STATE:-NY}"
DEMO_POSTAL_CODE="${DEMO_POSTAL_CODE:-10018}"
DEMO_COUNTRY="${DEMO_COUNTRY:-United States}"
DEMO_TIMEZONE="${DEMO_TIMEZONE:-America/New_York}"
DEMO_LEGAL_NAME="${DEMO_LEGAL_NAME:-Northstar Bank, N.A.}"
DEMO_BILLING_EMAIL="${DEMO_BILLING_EMAIL:-ap@northstarbank.demo}"
DEMO_VAT_TAX_ID="${DEMO_VAT_TAX_ID:-US-EIN-84-9912741}"
DEMO_INVITE_EDITOR="${DEMO_INVITE_EDITOR:-procurement.lead@northstarbank.demo}"
DEMO_INVITE_VIEWER="${DEMO_INVITE_VIEWER:-security.review@northstarbank.demo}"

UPLOAD_FILES=(
  "01_master_services_agreement.txt"
  "02_data_processing_addendum.pdf"
  "03_security_overview.pdf"
  "04_service_level_agreement.txt"
  "05_order_form_and_pricing.pdf"
  "06_implementation_plan.docx"
  "07_security_questionnaire_response.txt"
  "08_customer_success_email_thread.txt"
  "09_executive_steering_committee_notes.txt"
  "10_sso_setup_guide.docx"
)

json_get() {
  node -e '
    const fs = require("fs");
    const data = JSON.parse(fs.readFileSync(0, "utf8"));
    const path = process.argv[1].split(".");
    let cur = data;
    for (const key of path) {
      cur = cur?.[key];
    }
    if (cur === undefined || cur === null) process.exit(2);
    process.stdout.write(typeof cur === "string" ? cur : JSON.stringify(cur));
  ' "$1"
}

json_escape() {
  node -e '
    const value = process.argv[1] || "";
    process.stdout.write(JSON.stringify(value));
  ' "$1"
}

mime_type_for_file() {
  case "$1" in
    *.txt) echo "text/plain" ;;
    *.md) echo "text/markdown" ;;
    *.pdf) echo "application/pdf" ;;
    *.docx) echo "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ;;
    *)
      echo "Unsupported file type for $1" >&2
      exit 1
      ;;
  esac
}

document_exists() {
  local document_name="$1"

  DOCS_RESPONSE="$(curl -sS -X GET "$BASE_URL/organizations/$ORG_SLUG/documents" \
    -H "Authorization: Bearer $TOKEN")"

  printf '%s' "$DOCS_RESPONSE" | DOCUMENT_NAME="$document_name" node -e '
    const fs = require("fs");
    const data = JSON.parse(fs.readFileSync(0, "utf8"));
    const docs = data?.data?.documents || [];
    const exists = docs.some(doc => doc.original_name === process.env.DOCUMENT_NAME);
    process.stdout.write(exists ? "1" : "0");
  '
}

create_demo_logo_data_uri() {
  node <<'NODE'
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="24" fill="#111827"/>
  <path d="M26 92V36h14l24 30V36h14v56H64L40 62v30H26z" fill="#F8FAFC"/>
  <path d="M84 92V36h18c10.5 0 18 6.6 18 16.4 0 6.8-3.6 11.7-9.4 14.1L122 92h-16.8l-9.2-22.2H98V92H84zm14-33.6h3.5c5.2 0 8.3-2 8.3-5.9 0-4.1-3.1-6.1-8.3-6.1H98v12z" fill="#38BDF8"/>
</svg>`;
process.stdout.write(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);
NODE
}

configure_workspace_profile() {
  local logo_data_uri
  logo_data_uri="$(create_demo_logo_data_uri)"

  curl -sS -X PUT "$BASE_URL/organizations/$ORG_SLUG/profile" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    --data "{
      \"name\": $(json_escape "$ORG_NAME"),
      \"description\": $(json_escape "Competition demo workspace for a fictional enterprise deal between Northstar Bank and Aperture Cloud. Includes legal, security, pricing, onboarding, and customer evidence for source-backed retrieval."),
      \"logo\": $(json_escape "$logo_data_uri"),
      \"website\": $(json_escape "$DEMO_WEBSITE"),
      \"streetAddress\": $(json_escape "450 West 33rd Street, Floor 12"),
      \"city\": $(json_escape "$DEMO_CITY"),
      \"stateRegion\": $(json_escape "$DEMO_STATE"),
      \"postalCode\": $(json_escape "$DEMO_POSTAL_CODE"),
      \"country\": $(json_escape "$DEMO_COUNTRY"),
      \"timezone\": $(json_escape "$DEMO_TIMEZONE")
    }" >/dev/null
}

configure_workspace_billing() {
  curl -sS -X PUT "$BASE_URL/organizations/$ORG_SLUG/billing" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    --data "{
      \"legalName\": $(json_escape "$DEMO_LEGAL_NAME"),
      \"billingEmail\": $(json_escape "$DEMO_BILLING_EMAIL"),
      \"vatTaxId\": $(json_escape "$DEMO_VAT_TAX_ID"),
      \"plan\": \"enterprise\",
      \"billingAddress\": {
        \"street\": $(json_escape "450 West 33rd Street, Floor 12"),
        \"city\": $(json_escape "$DEMO_CITY"),
        \"stateRegion\": $(json_escape "$DEMO_STATE"),
        \"postalCode\": $(json_escape "$DEMO_POSTAL_CODE"),
        \"country\": $(json_escape "$DEMO_COUNTRY")
      }
    }" >/dev/null
}

configure_workspace_security() {
  curl -sS -X PUT "$BASE_URL/organizations/$ORG_SLUG/security" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    --data '{
      "dataResidency": "us",
      "require2FA": false,
      "sessionTimeout": "8h",
      "passwordPolicy": "strong",
      "auditRetention": "365d",
      "ssoEnabled": true,
      "ssoConfig": {
        "provider": "Okta",
        "ssoUrl": "https://northstarbank.okta.demo/app/aperture-cloud/sso/saml",
        "entityId": "urn:northstarbank:aperture-cloud:demo"
      }
    }' >/dev/null
}

invite_demo_team() {
  curl -sS -X POST "$BASE_URL/organizations/$ORG_SLUG/invitations" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    --data "{
      \"emails\": [$(json_escape "$DEMO_INVITE_EDITOR"), $(json_escape "$DEMO_INVITE_VIEWER")],
      \"role\": \"EDITOR\"
    }" >/dev/null
}

complete_workspace_setup() {
  curl -sS -X POST "$BASE_URL/organizations/$ORG_SLUG/setup/skip" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    --data '{"step":"integrations"}' >/dev/null
}

if [ -f "$RICH_FILES_SCRIPT" ]; then
  bash "$RICH_FILES_SCRIPT"
fi

echo "Registering demo user: $EMAIL"
REGISTER_RESPONSE="$(curl -sS -X POST "$BASE_URL/auth/register" \
  -H 'Content-Type: application/json' \
  --data "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"account_type\":\"ORGANIZATION\"}")"

if echo "$REGISTER_RESPONSE" | grep -q '"message":"User already exists"'; then
  echo "User exists, logging in instead"
  AUTH_RESPONSE="$(curl -sS -X POST "$BASE_URL/auth/login" \
    -H 'Content-Type: application/json' \
    --data "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")"
  TOKEN="$(printf '%s' "$AUTH_RESPONSE" | json_get 'data.token')"
else
  TOKEN="$(printf '%s' "$REGISTER_RESPONSE" | json_get 'token')"
fi

echo "Creating organization: $ORG_NAME ($ORG_SLUG)"
CREATE_ORG_RESPONSE="$(curl -sS -X POST "$BASE_URL/organizations" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  --data "{\"name\":\"$ORG_NAME\",\"slug\":\"$ORG_SLUG\",\"description\":\"Competition demo corpus for source-backed enterprise retrieval.\",\"industry\":\"Financial Services\",\"teamSize\":\"201-500\"}")"

if echo "$CREATE_ORG_RESPONSE" | grep -q 'already exists'; then
  echo "Organization exists, continuing with existing slug"
else
  printf '%s' "$CREATE_ORG_RESPONSE" | json_get 'data.organization.id' >/dev/null
fi

echo "Configuring workspace profile and setup"
configure_workspace_profile
configure_workspace_billing
configure_workspace_security
invite_demo_team || true
complete_workspace_setup

echo "Uploading corpus files"
for name in "${UPLOAD_FILES[@]}"; do
  file="$CORPUS_DIR/$name"

  if [ ! -f "$file" ]; then
    echo "  - missing $name" >&2
    exit 1
  fi

  if [ "$(document_exists "$name")" = "1" ]; then
    echo "  - $name (already uploaded)"
    continue
  fi

  mime_type="$(mime_type_for_file "$name")"
  echo "  - $name"
  curl -sS -X POST "$BASE_URL/organizations/$ORG_SLUG/documents" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@$file;type=$mime_type" >/dev/null
done

echo "Waiting for processing"
for _ in $(seq 1 120); do
  DOCS_RESPONSE="$(curl -sS -X GET "$BASE_URL/organizations/$ORG_SLUG/documents" \
    -H "Authorization: Bearer $TOKEN")"
  COMPLETED_COUNT="$(printf '%s' "$DOCS_RESPONSE" | node -e '
    const fs = require("fs");
    const data = JSON.parse(fs.readFileSync(0, "utf8"));
    const docs = data?.data?.documents || [];
    const uploaded = docs.filter(doc => doc.type !== "integration");
    const completed = uploaded.filter(doc => doc.status === "COMPLETED").length;
    const failed = uploaded.filter(doc => doc.status === "FAILED").length;
    process.stdout.write(JSON.stringify({total: uploaded.length, completed, failed}));
  ')"
  TOTAL="$(printf '%s' "$COMPLETED_COUNT" | json_get 'total')"
  COMPLETED="$(printf '%s' "$COMPLETED_COUNT" | json_get 'completed')"
  FAILED="$(printf '%s' "$COMPLETED_COUNT" | json_get 'failed')"
  echo "  status: $COMPLETED/$TOTAL completed, $FAILED failed"
  if [ "$TOTAL" -gt 0 ] && [ "$COMPLETED" -eq "$TOTAL" ]; then
    break
  fi
  sleep 2
done

echo
echo "Demo environment ready"
echo "Email: $EMAIL"
echo "Password: $PASSWORD"
echo "Organization slug: $ORG_SLUG"
echo "Search endpoint: $BASE_URL/search/organization/$ORG_SLUG"
