#!/usr/bin/env bash
# Segment 3: agent readiness of the live site, scored by isitagentready.com's own API with its
# default "All Checks" profile. The percentage is computed exactly as the site's page does:
# passes over passes and failures, leaving out commerce, neutral (informational) checks and the
# Personal Agent Protocol (its `Re()`, informational per its skill).
# Gates: React Doctor stays 100, check and build pass, the live site serves this build.
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
node_modules/.bin/vp run build >/tmp/gildrb-build.log 2>&1 || { tail -n 30 /tmp/gildrb-build.log; exit 1; }

# (A captured page, not `curl | grep -q`: grep quitting early would fail the pipe.)
script=$(grep -o '/assets/client-[^"]*\.js' dist/index.html | sed -n 1p)
live=""
for _ in $(seq 1 40); do
  live=$(curl -sf "https://gildrb.com/?v=$RANDOM" || true)
  [[ "$live" == *"$script"* ]] && break
  sleep 6
done
[[ "$live" == *"$script"* ]] || { echo "live site is not on this build ($script)"; exit 1; }

# The scanner's default profile: every check but the A2A card and AP2.
checks='["robotsTxt","sitemap","linkHeaders","dnsAid","markdownNegotiation","robotsTxtAiRules","contentSignals","webBotAuth","apiCatalog","oauthDiscovery","oauthProtectedResource","authMd","mcpServerCard","agentSkills","webMcp","ard","personalAgentProtocol","x402","mpp","ucp","acp"]'
out=/tmp/gildrb-agent-ready.json
curl -sf --max-time 120 -X POST https://isitagentready.com/api/scan \
jq -r '[.checks | to_entries[] | select(.key != "commerce") | .value | to_entries[]
    | select(.key != "personalAgentProtocol") | .value.status
    | select(. == "pass" or . == "fail")] as $s
jq -r '.checks | to_entries[] | .key as $c | .value | to_entries[] | "  \(.value.status) \($c).\(.key)"' "$out"
jq -r '[.checks | to_entries[] | select(.key != "commerce") | .value[] | .status
    | select(. == "pass" or . == "fail")] as $s
  | ($s | map(select(. == "pass")) | length) as $p
  | "METRIC agent_ready_pct=\(if ($s | length) > 0 then ($p * 100 / ($s | length) | round) else 0 end)",
    "METRIC agent_checks_passed=\($p)",
    "METRIC agent_checks_failed=\(($s | length) - $p)"' "$out"
echo "METRIC agent_level=$(jq -r '.level' "$out")"
