#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://localhost:4173}"
OUT="$(cd "$(dirname "$0")/../../.." && pwd)/docs/nfr/evidence/lighthouse"
mkdir -p "$OUT"

# screen name -> hash route
ROUTES=(
  "login:/#/login"
  "signup:/#/signup"
  "dashboard:/#/app/gestures"
  "analytics:/#/app/analytics"
  "settings:/#/app/settings"
)

echo "auditing $BASE -> $OUT"
for entry in "${ROUTES[@]}"; do
  name="${entry%%:*}"
  route="${entry#*:}"
  echo "  $name"
  npx --yes lighthouse "${BASE}${route}" \
    --preset=desktop \
    --only-categories=performance,accessibility,best-practices \
    --chrome-flags="--headless=new --no-sandbox" \
    --output=html --output=json \
    --output-path="${OUT}/${name}" \
    --quiet
done

echo
echo "scores:"
for entry in "${ROUTES[@]}"; do
  name="${entry%%:*}"
  node -e "
    const r = require('${OUT}/${name}.report.json');
    const pct = (c) => Math.round((r.categories[c]?.score ?? 0) * 100);
    const audit = (id) => r.audits[id]?.displayValue ?? '-';
    console.log(
      '  ${name}'.padEnd(14),
      'perf', String(pct('performance')).padStart(3),
      '| a11y', String(pct('accessibility')).padStart(3),
      '| FCP', audit('first-contentful-paint').padStart(8),
      '| LCP', audit('largest-contentful-paint').padStart(8)
    );
  "
done