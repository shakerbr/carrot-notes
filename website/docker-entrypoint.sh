#!/bin/sh
set -e

if [ -f /app/standalone/website/server.js ]; then
  cd /app/standalone/website
elif [ -f /app/standalone/server.js ]; then
  cd /app/standalone
else
  echo "Could not find Next.js standalone server.js" >&2
  find /app/standalone -name server.js 2>/dev/null || true
  exit 1
fi

exec node server.js
