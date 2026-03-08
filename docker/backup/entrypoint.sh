#!/bin/sh

set -eu

export TZ="${TZ:-Europe/Warsaw}"
export BACKUP_DIR="${BACKUP_DIR:-/backups}"
STARTUP_MARKER="${BACKUP_DIR}/.startup_backup_$(date +%Y-%m-%d)"
BACKUP_CRON_EXPR="${BACKUP_CRON:-0 3 * * *}"
LAST_SCHEDULED_MARKER="${BACKUP_DIR}/.last_scheduled_backup"

mkdir -p "${BACKUP_DIR}"

BACKUP_MINUTE="$(echo "${BACKUP_CRON_EXPR}" | awk '{print $1}')"
BACKUP_HOUR="$(echo "${BACKUP_CRON_EXPR}" | awk '{print $2}')"

case "${BACKUP_MINUTE}" in
    ''|*[!0-9]*)
        echo "Blad: minuta w BACKUP_CRON musi byc liczba 0-59. Otrzymano: '${BACKUP_MINUTE}'" >&2
        exit 1
        ;;
esac

case "${BACKUP_HOUR}" in
    ''|*[!0-9]*)
        echo "Blad: godzina w BACKUP_CRON musi byc liczba 0-23. Otrzymano: '${BACKUP_HOUR}'" >&2
        exit 1
        ;;
esac

BACKUP_MINUTE_PADDED="$(printf '%02d' "${BACKUP_MINUTE}")"
BACKUP_HOUR_PADDED="$(printf '%02d' "${BACKUP_HOUR}")"

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

if [ "${BACKUP_RUN_ON_STARTUP:-false}" = "true" ]; then
    if [ ! -f "${STARTUP_MARKER}" ]; then
        /app/run_backup.sh
        touch "${STARTUP_MARKER}"
    else
        echo "Pominieto backup startowy: istnieje znacznik ${STARTUP_MARKER}"
    fi
fi

echo "Uruchomiono harmonogram backupu: ${BACKUP_CRON_EXPR}"

while true; do
    NOW_DATE="$(date +%Y-%m-%d)"
    NOW_HOUR="$(date +%H)"
    NOW_MINUTE="$(date +%M)"
    LAST_RUN_DATE="$(cat "${LAST_SCHEDULED_MARKER}" 2>/dev/null || true)"

    if [ "${NOW_HOUR}" = "${BACKUP_HOUR_PADDED}" ] && [ "${NOW_MINUTE}" = "${BACKUP_MINUTE_PADDED}" ]; then
        if [ "${LAST_RUN_DATE}" != "${NOW_DATE}" ]; then
            if /app/run_backup.sh; then
                echo "${NOW_DATE}" > "${LAST_SCHEDULED_MARKER}"
            fi
        fi
        sleep 60
        continue
    fi

    sleep 20
done