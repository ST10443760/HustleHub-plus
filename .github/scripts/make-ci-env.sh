#!/usr/bin/env bash
# Writes a job-local .env for docker compose with RANDOM credentials, so the
# pipeline needs no repository secrets. Every value is masked first, so it
# can never appear in the logs. The .env lives only on the runner and is
# thrown away with it.
set -euo pipefail

jwt_secret="$(openssl rand -hex 48)"                     # 96 characters
admin_password="Ci$(openssl rand -hex 16)9"              # 35 characters
admin_email="ci-admin-$(openssl rand -hex 4)@hustlehub.test"

echo "::add-mask::${jwt_secret}"
echo "::add-mask::${admin_password}"
echo "::add-mask::${admin_email}"

umask 077
# Single-word values only: the file is also sourced by bash in the pipeline.
cat > .env <<EOF
JWT_SECRET=${jwt_secret}
JWT_EXPIRES_IN=1h
ADMIN_EMAIL=${admin_email}
ADMIN_NAME=CI-Admin
ADMIN_PASSWORD=${admin_password}
EOF

echo "Wrote a job-local .env with generated credentials (values masked)."
