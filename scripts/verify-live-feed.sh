#!/usr/bin/env bash
# Post-deploy check: live feeds return data and syncedAt advances.
set -euo pipefail

BASE="${1:-https://xauconnect.com}"

echo "==> verify launches/live (2 samples, 3s apart)"
read1="$(curl -sf "$BASE/api/market/launches/live")"
sleep 3
read2="$(curl -sf "$BASE/api/market/launches/live")"

python3 - <<'PY' "$read1" "$read2"
import json, sys
r1 = json.loads(sys.argv[1])
r2 = json.loads(sys.argv[2])
n1 = len(r1.get("launches") or [])
n2 = len(r2.get("launches") or [])
s1 = r1.get("syncedAt", 0)
s2 = r2.get("syncedAt", 0)
p1 = (r1.get("launches") or [{}])[0].get("priceUsd")
p2 = (r2.get("launches") or [{}])[0].get("priceUsd")
print(f"  launches: {n1} -> {n2}")
print(f"  syncedAt: {s1} -> {s2} (delta {s2 - s1}ms)")
print(f"  top price: {p1} -> {p2}")
if n1 < 1 or n2 < 1:
    raise SystemExit("FAIL: launches feed empty")
if s2 <= s1:
    raise SystemExit("FAIL: syncedAt did not advance — live tick stuck")
print("  launches/live OK")
PY

echo "==> verify discovery/trending"
disc="$(curl -sf "$BASE/api/market/discovery/trending")"
python3 - <<'PY' "$disc"
import json, sys
d = json.loads(sys.argv[1])
n = len(d.get("tokens") or [])
print(f"  trending tokens: {n}")
if n < 1:
    raise SystemExit("FAIL: discovery trending empty")
print("  discovery/trending OK")
PY

echo "==> live feed verification passed"
