#!/bin/bash
# Single entry point for the daily editorial task (so only one command needs to be allow-listed).
#   daily.sh prepare              -> git pull, collect all candidates, print status
#   daily.sh publish <editorial>  -> apply editorial JSON, build, commit day file + seen store, push (with retry)
set -euo pipefail
export PATH=/Users/KHari/Claude_code/gue-dive-planner/.node/bin:$PATH
REPO=/Users/KHari/Claude_code/cyber-news
cd "$REPO"
TODAY=$(date -u +%F)
DAY="public/data/days/$TODAY.json"

case "${1:-}" in
  prepare)
    git pull -q --ff-only origin main
    if [ -f "$DAY" ] && grep -q '"editorial": "done"' "$DAY"; then
      echo "STATUS=already-published DATE=$TODAY DAY=$DAY POST=posts/$TODAY.md"
      exit 0
    fi
    npm run --silent collect -- --no-llm --keep-all
    echo "STATUS=ready DATE=$TODAY DAY=$DAY ITEMS=$(python3 -c "import json;print(len(json.load(open('$DAY'))['items']))")"
    ;;
  publish)
    ED="${2:?editorial json path required}"
    node scripts/apply-editorial.mjs "$TODAY" "$ED"
    npm run --silent build >/dev/null
    git add "$DAY" data/seen-urls.json
    if git diff --cached --quiet; then echo "STATUS=nothing-to-commit"; exit 0; fi
    git -c user.name="Krisztian Hari" -c user.email="khari@yettel.hu" commit -q -m "digest: $TODAY (editorial)"
    for i in 1 2 3; do
      if git push -q origin main 2>/dev/null; then echo "STATUS=pushed DATE=$TODAY POST=posts/$TODAY.md"; exit 0; fi
      sleep 30
    done
    echo "STATUS=push-failed DATE=$TODAY (commit kept locally)"; exit 1
    ;;
  *) echo "usage: daily.sh prepare | publish <editorial.json>"; exit 2 ;;
esac
