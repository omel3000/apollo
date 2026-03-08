#!/bin/sh

set -eu

export TZ="${TZ:-Europe/Warsaw}"
export BACKUP_DIR="${BACKUP_DIR:-/backups}"

mkdir -p /etc/crontabs "${BACKUP_DIR}"

cat > /app/backup.env <<EOF
POSTGRES_HOST=${POSTGRES_HOST:-postgres-db}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
POSTGRES_USER=${POSTGRES_USER:-apollo}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-apollo123}
POSTGRES_DB=${POSTGRES_DB:-apollo_test_db}
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-32}
BACKUP_DIR=${BACKUP_DIR}
TZ=${TZ}
EOF

cat > /etc/crontabs/root <<EOF
SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
TZ=${TZ}
${BACKUP_CRON:-0 3 * * *} set -a; . /app/backup.env; set +a; /app/backup.sh >> /var/log/backup.log 2>&1
EOF

if [ "${BACKUP_RUN_ON_STARTUP:-false}" = "true" ]; then
    set -a
    . /app/backup.env
    set +a
    /app/backup.sh
fi

echo "Uruchomiono harmonogram backupu: ${BACKUP_CRON:-0 3 * * *}"

exec crond -f -l 2