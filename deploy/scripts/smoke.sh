#!/bin/bash
# Usage: smoke.sh <base url> <allowed origin> [expected git sha]
#   smoke.sh https://api.<domain> https://app.<domain>
#   smoke.sh http://127.0.0.1:8787 https://app.<domain> 0123abc...
# Checks liveness, readiness, the deployed version, and that a guest sign-in gets two sample plans.
set -euo pipefail

base="${1:?usage: smoke.sh <base url> <allowed origin> [expected sha]}"
origin="${2:?usage: smoke.sh <base url> <allowed origin> [expected sha]}"
expected_sha="${3:-}"
base="${base%/}"
fail=0

check() {
  if [ "$2" = "$3" ]; then
    echo "ok    $1"
  else
    echo "FAIL  $1 (expected $3, got $2)"
    fail=1
  fi
}

status_of() { curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$base$1" || true; }

check "GET /health/live" "$(status_of /health/live)" 200
check "GET /health/ready" "$(status_of /health/ready)" 200

health="$(curl -s --max-time 10 "$base/api/health" || true)"
version="$(printf '%s' "$health" | sed -n 's/.*"version":"\([^"]*\)".*/\1/p')"
paypal_env="$(printf '%s' "$health" | sed -n 's/.*"paypal_env":"\([^"]*\)".*/\1/p')"
check "/api/health paypal_env" "$paypal_env" sandbox
if [ -n "$expected_sha" ]; then
  check "/api/health version" "$version" "$expected_sha"
else
  echo "info  /api/health version $version"
fi

# Guest sign-in returns 201 and a Secure session cookie. Read the cookie from the header ourselves, because
# curl would not send a Secure cookie back over the plain-http localhost address.
headers="$(mktemp)"
trap 'rm -f "$headers"' EXIT
guest_status="$(curl -s -o /dev/null -D "$headers" -w '%{http_code}' --max-time 10 -X POST \
  -H "Origin: $origin" -H 'Content-Type: application/json' --data '{}' "$base/api/auth/guest" || true)"
check "POST /api/auth/guest" "$guest_status" 201
cookie="$(tr -d '\r' <"$headers" | sed -n 's/^[Ss]et-[Cc]ookie: \([^;]*\).*/\1/p' | head -1)"

if [ -n "$cookie" ]; then
  plans="$(curl -s --max-time 10 -H "Cookie: $cookie" "$base/api/contracts" || true)"
  count="$(printf '%s' "$plans" | grep -o '"seed_key":' | wc -l | tr -d ' ')"
  check "guest has two sample plans" "$count" 2
else
  echo "FAIL  guest sign-in set no session cookie"
  fail=1
fi

if [ "$fail" -eq 0 ]; then
  echo "SMOKE PASSED"
else
  echo "SMOKE FAILED"
fi
exit "$fail"
