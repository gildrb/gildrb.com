#!/usr/bin/env bash
# Scores the codebase with React Doctor (pinned 0.9.18, the `npx react-doctor@latest` of
# 2026-10-15, default checks). The score comes from the react.doctor score API, a pure function
# of the diagnostics; error and warning counts are local.
# Gates, so a fix cannot break the site: the lint/type/format check and the build.
set -euo pipefail
root="$(cd "$(dirname "$0")" && pwd)"
cd "$root"

report=/tmp/gildrb-react-doctor.json
rm -f "$report"
# Run outside the repo: its devEngines pin npm, which npx would otherwise trip over.
# Exits 1 while any error-level diagnostic remains; the report decides.
(cd /tmp && npx --yes react-doctor@0.9.18 "$root" --yes --no-cache --json --json-out "$report") \
  >/tmp/gildrb-react-doctor.log 2>&1 || true
jq -e '.ok == true and .summary.score != null' "$report" >/dev/null || {
  jq -c '{ok, error, summary}' "$report" 2>/dev/null || echo "react-doctor wrote no report"
  exit 1
}
jq -r '.diagnostics[] | "\(.severity) \(.plugin)/\(.rule) \(.filePath):\(.line)"' "$report" |
  sort | uniq -c | sort -rn | sed 's/^/  /'
jq -r '.summary |
  "METRIC react_doctor_score=\(.score)",
  "METRIC errors=\(.errorCount)",
  "METRIC warnings=\(.warningCount)",
  "METRIC diagnostics=\(.totalDiagnosticCount)"' "$report"

node_modules/.bin/vp check >/tmp/gildrb-check.log 2>&1 || { tail -n 30 /tmp/gildrb-check.log; exit 1; }
node_modules/.bin/vp run build >/tmp/gildrb-build.log 2>&1 || { tail -n 30 /tmp/gildrb-build.log; exit 1; }
