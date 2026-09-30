#!/usr/bin/env bash
# Runs the database test suite against DATABASE_URL (defaults to local Supabase).
# All changes are rolled back.
set -euo pipefail
DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
psql "$DB_URL" -X -q -v ON_ERROR_STOP=1 -f "$(dirname "$0")/security.test.sql"
