#!/usr/bin/env bash
# Segment 4: is-agentic.com's "Content without JavaScript" check (the only one below full marks
# that code can fix; its report caches, so it cannot be re-run per change). Reproduced on the
# build: visible text over the <body> markup without scripts, which matches its evidence
# (1606 chars at 2.1%). Target: >= 500 chars and >= 5%.
# Gates: React Doctor stays 100, tests, check and build pass.
set -euo pipefail
root="$(cd "$(dirname "$0")" && pwd)"
cd "$root"

report=/tmp/gildrb-react-doctor.json
rm -f "$report"
(cd /tmp && npx --yes react-doctor@0.9.18 "$root" --yes --no-cache --json --json-out "$report") \
  >/tmp/gildrb-react-doctor.log 2>&1 || true
doctor=$(jq -r '.summary.score' "$report")
echo "METRIC react_doctor_score=$doctor"
[ "$doctor" = 100 ] || { echo "React Doctor dropped to $doctor"; exit 1; }
node_modules/.bin/vp check >/tmp/gildrb-check.log 2>&1 || { tail -n 30 /tmp/gildrb-check.log; exit 1; }
node_modules/.bin/vp test >/tmp/gildrb-test.log 2>&1 || { tail -n 40 /tmp/gildrb-test.log; exit 1; }
node_modules/.bin/vp run build >/tmp/gildrb-build.log 2>&1 || { tail -n 30 /tmp/gildrb-build.log; exit 1; }

python3 - <<'EOF'
import html, re
page = open("dist/index.html", encoding="utf-8").read()
body = re.search(r"<body[\s\S]*</body>", page).group(0)
markup = re.sub(r"<script[\s\S]*?</script>", "", body)
text = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", markup))).strip()
print(f"METRIC content_ratio_pct={100 * len(text) / len(markup):.2f}")
print(f"METRIC content_chars={len(text)}")
print(f"METRIC html_bytes={len(page)}")
EOF
