#!/bin/sh
set -e

# Read password from Docker Secret file or env var
PG_PASS="${POSTGRES_PASSWORD}"
if [ -f /run/secrets/postgres_password ]; then
    PG_PASS=$(cat /run/secrets/postgres_password)
fi

PG_USER="${POSTGRES_USER:-template_user}"
PG_DB="${POSTGRES_DB:-template_db}"

# Generate userlist.txt
echo "\"${PG_USER}\" \"${PG_PASS}\"" > /etc/pgbouncer/userlist.txt

# Patch pgbouncer.ini with actual database name and credentials
sed -i "s/template_db/${PG_DB}/g" /etc/pgbouncer/pgbouncer.ini

exec pgbouncer /etc/pgbouncer/pgbouncer.ini
