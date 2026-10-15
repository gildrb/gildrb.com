#!/usr/bin/env bash
# Segment 2: PageSpeed on the live site, which deploys from `main` (Cloudflare Pages, ~1 min).
# Lighthouse (the engine PageSpeed Insights runs, with its mobile and desktop presets), run
# locally because the keyless PSI API quota is shared and often exhausted. Three page types:
# the homepage, a case study and the archive. The metric is the mean of every category score;
# the minimum is reported too, so one weak page cannot hide in the mean.
# Gates first, so nothing broken is measured: React Doctor stays 100, check and build pass,
# and the live site serves the commit being measured.
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

# The live homepage must carry this build's script hash before it is worth measuring.
# (A captured page, not `curl | grep -q`: grep quitting early would fail the pipe.)
script=$(grep -o '/assets/client-[^"]*\.js' dist/index.html | sed -n 1p)
live=""
for _ in $(seq 1 40); do
  live=$(curl -sf "https://gildrb.com/?v=$RANDOM" || true)
  [[ "$live" == *"$script"* ]] && break
  sleep 6
done
[[ "$live" == *"$script"* ]] || { echo "live site is not on this build ($script)"; exit 1; }

scores=()
for page in / /t3 /all; do
  for strategy in mobile desktop; do
    out="/tmp/gildrb-lh-${strategy}${page//\//_}.json"
    preset=()
    [ "$strategy" = desktop ] && preset=(--preset=desktop)
    # Outside the repo, like React Doctor: its devEngines pin npm.
    (cd /tmp && CHROME_PATH="$(command -v chromium)" npx --yes lighthouse@13 "https://gildrb.com$page" \
      "${preset[@]}" --quiet --output=json --output-path="$out" \
      --only-categories=performance,accessibility,best-practices,seo \
      --chrome-flags="--headless=new --no-sandbox") >/tmp/gildrb-lh.log 2>&1 ||
      { tail -n 20 /tmp/gildrb-lh.log; exit 1; }
    line=$(jq -r '[.categories[] | "\(.id)=\(.score * 100 | round)"] | join(" ")' "$out")
    echo "  $strategy $page $line"
    jq -r --arg s "$strategy" --arg p "$page" '.audits | to_entries[]
      | select(.value.score != null and .value.score < 0.9 and .value.scoreDisplayMode != "informative" and .value.scoreDisplayMode != "manual")
      | "    \($s) \($p) \(.key) \(.value.score) \(.value.displayValue // "")"' "$out"
    while read -r value; do scores+=("$value"); done < <(jq -r '.categories[].score * 100 | round' "$out")
  done
done
printf '%s\n' "${scores[@]}" | awk '{ s += $1; if (min == "" || $1 < min) min = $1 } END {
  printf "METRIC pagespeed_mean=%.2f\nMETRIC pagespeed_min=%d\n", s / NR, min }'
