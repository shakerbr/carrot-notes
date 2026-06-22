#!/bin/sh
set -e
cd /app/standalone

if [ -f server.js ]; then
  exec node server.js
elif [ -f website/server.js ]; then
  exec node website/server.js
else
  echo "Could not find Next.js standalone server.js" >&2
  find . -name server.js 2>/dev/null || true
  exit 1
fi
