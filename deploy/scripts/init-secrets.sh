#!/bin/bash
set -e

SECRETS_DIR="${1:-./secrets}"

if [ -d "$SECRETS_DIR" ] && [ "$(ls -A "$SECRETS_DIR" 2>/dev/null)" ]; then
    echo "Secrets directory already exists and is not empty: $SECRETS_DIR"
    echo "Delete it first if you want to regenerate: rm -rf $SECRETS_DIR"
    exit 1
fi

echo "=== Generating secrets in $SECRETS_DIR ==="
mkdir -p "$SECRETS_DIR"

# JWT secret key
openssl rand -hex 64 > "$SECRETS_DIR/secret_key"
echo "  secret_key: generated"

# Fernet encryption key
python3 -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())' > "$SECRETS_DIR/encryption_key"
echo "  encryption_key: generated"

# PostgreSQL password
openssl rand -hex 32 > "$SECRETS_DIR/postgres_password"
echo "  postgres_password: generated"

# Redis password
openssl rand -hex 32 > "$SECRETS_DIR/redis_password"
echo "  redis_password: generated"

# Meilisearch master key
openssl rand -hex 32 > "$SECRETS_DIR/meilisearch_master_key"
echo "  meilisearch_master_key: generated"

# SMTP password (placeholder — set manually)
echo "CHANGE_ME" > "$SECRETS_DIR/smtp_password"
echo "  smtp_password: placeholder (edit manually)"

# Restrict permissions
chmod 600 "$SECRETS_DIR"/*
echo ""
echo "=== All secrets generated in $SECRETS_DIR ==="
echo ""
echo "IMPORTANT: Update your .env file with the actual values where needed:"
echo "  - REDIS_URL must include the redis password"
echo "  - POSTGRES_PASSWORD in .env should match the secret (for pgbouncer env)"
echo "  - Edit secrets/smtp_password with your real SMTP password"
