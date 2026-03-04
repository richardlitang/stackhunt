#!/usr/bin/env bash
set -euo pipefail

FULL=0
AUTOFIX=0

for arg in "$@"; do
  case "$arg" in
    --full) FULL=1 ;;
    --autofix) AUTOFIX=1 ;;
    *) echo "Unknown arg: $arg"; exit 2 ;;
  esac
done

DOC_ARGS=(--max-age-days 90 --apply-plan)
if [[ "$AUTOFIX" -eq 1 ]]; then
  DOC_ARGS+=(--autofix-last-verified)
fi

python3 scripts/doc_gardener.py "${DOC_ARGS[@]}"
python3 scripts/check_docs_harness.py --max-age-days 90

if [[ "$FULL" -eq 1 ]]; then
  npm run typecheck
  npm run qa:content-policy
fi
