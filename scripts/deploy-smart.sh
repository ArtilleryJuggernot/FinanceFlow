#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./scripts/deploy-smart.sh
#   ./scripts/deploy-smart.sh <from_commit> <to_commit>
#   ./scripts/deploy-smart.sh --force-prisma
#   ./scripts/deploy-smart.sh --force-prisma <from_commit> <to_commit>
#
# Behavior:
# - Runs `sudo npm i` only when dependency files changed.
# - Runs Prisma commands when schema changed.
# - Always runs `npm run build`.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FORCE_PRISMA=false
POSITIONAL_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force-prisma)
      FORCE_PRISMA=true
      shift
      ;;
    *)
      POSITIONAL_ARGS+=("$1")
      shift
      ;;
  esac
done

if [[ "${#POSITIONAL_ARGS[@]}" -ge 2 ]]; then
  RANGE="${POSITIONAL_ARGS[0]}..${POSITIONAL_ARGS[1]}"
elif git rev-parse --verify ORIG_HEAD >/dev/null 2>&1; then
  RANGE="ORIG_HEAD..HEAD"
elif git rev-parse --verify HEAD~1 >/dev/null 2>&1; then
  RANGE="HEAD~1..HEAD"
else
  RANGE=""
fi

echo "=== Smart Deploy Start ==="
echo "Repo: $ROOT_DIR"
echo "Range: ${RANGE:-<none>}"

CHANGED_FILES=""
if [[ -n "$RANGE" ]]; then
  CHANGED_FILES="$(git diff --name-only "$RANGE" || true)"
fi

if [[ -z "$CHANGED_FILES" ]]; then
  CHANGED_FILES="$(git status --porcelain | awk '{print $2}' || true)"
fi

echo "Changed files:"
if [[ -n "$CHANGED_FILES" ]]; then
  echo "$CHANGED_FILES"
else
  echo "  (none detected)"
fi

needs_npm_install=false
needs_prisma=false

if echo "$CHANGED_FILES" | grep -E '(^|/)(package\.json|package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$' >/dev/null 2>&1; then
  needs_npm_install=true
fi

if echo "$CHANGED_FILES" | grep -E '(^|/)(prisma/schema\.prisma|prisma/migrations/)' >/dev/null 2>&1; then
  needs_prisma=true
fi

if [[ "$FORCE_PRISMA" == true ]]; then
  needs_prisma=true
  echo "-> Force prisma enabled (--force-prisma)"
fi

if [[ "$needs_npm_install" == true ]]; then
  echo "-> Dependencies changed: running sudo npm i"
  sudo npm i
else
  echo "-> Dependencies unchanged: skipping npm i"
fi

if [[ "$needs_prisma" == true ]]; then
  echo "-> Prisma changes detected: running prisma generate + migrate deploy"
  npx prisma generate
  npx prisma migrate deploy
else
  echo "-> Prisma unchanged: skipping prisma commands"
fi

echo "-> Running production build"
npm run build

echo "=== Smart Deploy Done ==="
