#!/usr/bin/env bash
# Run from Spidrahub monorepo root: /opt/spidrahub
# Usage: ./apps/carrot-notes/website/scripts/deploy-on-vm.sh

set -euo pipefail

MONOREPO_ROOT="${MONOREPO_ROOT:-/opt/spidrahub}"
SERVICE_NAME="${SERVICE_NAME:-carrot-notes}"
SUBMODULE_PATH="${SUBMODULE_PATH:-apps/carrot-notes}"

cd "$MONOREPO_ROOT"

echo "→ Updating submodule ${SUBMODULE_PATH}..."
git submodule update --remote --init "$SUBMODULE_PATH"

echo "→ Building Docker image..."
docker compose build "$SERVICE_NAME"

echo "→ Starting container..."
docker compose up -d "$SERVICE_NAME"

echo "→ Done. Logs:"
docker compose logs --tail=20 "$SERVICE_NAME"
