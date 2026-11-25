#!/usr/bin/env bash
set -euo pipefail

raiz="$(cd "$(dirname "$0")/.." && pwd)"
cd "$raiz"

npm install --no-audit --no-fund
npx supabase start
npx supabase db reset

eval "$(npx supabase status -o env | grep -E '^(API_URL|DB_URL|SERVICE_ROLE_KEY)=' | sed 's/^/export /')"
export TEST_SUPABASE_URL="$API_URL"
export TEST_SUPABASE_SERVICE_KEY="$SERVICE_ROLE_KEY"
export TEST_DATABASE_URL="$DB_URL"

cd backend
[ -d .venv ] || python3 -m venv .venv
source .venv/bin/activate
pip install -q -r requirements.txt "psycopg[binary]"

ruff check .
pytest -q -rs
