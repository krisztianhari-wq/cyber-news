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


# Hand the private social post to the editor: copy to the Desktop and show a macOS notification.
# Never uploads or posts anywhere.
deliver_post() {
  local pushed="$1" dest="$HOME/Desktop/Cyber Digest posts"
  mkdir -p "$dest"
  [ -f "posts/$TODAY.md" ] && cp "posts/$TODAY.md" "$dest/$TODAY.md"
  # Power Automate hand-off: plain-text copy (no markdown header) into a OneDrive-synced folder.
  # A flow in the company tenant picks it up and posts to Viva Engage under the owner's account.
  # Only active if the folder exists (creating it is the owner's opt-in).
  local od="${ENGAGE_INBOX:-$HOME/Library/CloudStorage/OneDrive-CEETelcoGroup/Documents/CyberDigest/engage-inbox}"
  if [ "$pushed" = 1 ] && [ -d "$od" ] && [ -f "posts/$TODAY.md" ]; then
    tail -n +3 "posts/$TODAY.md" > "$od/cyber-digest-$TODAY.txt"
  fi
  local msg
  if [ "$pushed" = 1 ]; then msg="Edition published. Post: Desktop/Cyber Digest posts/$TODAY.md"; else msg="Edition built but push FAILED. Post: Desktop/Cyber Digest posts/$TODAY.md"; fi
  osascript -e "display notification \"$msg\" with title \"Yettel Cyber Digest\" subtitle \"$TODAY\" sound name \"Glass\"" >/dev/null 2>&1 || true
}

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
    PUSHED=0
    for i in 1 2 3; do
      if git push -q origin main 2>/dev/null; then PUSHED=1; break; fi
      sleep 30
    done
    deliver_post "$PUSHED"
    if [ "$PUSHED" = 1 ]; then echo "STATUS=pushed DATE=$TODAY POST=posts/$TODAY.md"; exit 0; fi
    echo "STATUS=push-failed DATE=$TODAY (commit kept locally)"; exit 1
    ;;
  *) echo "usage: daily.sh prepare | publish <editorial.json>"; exit 2 ;;
esac
