#!/bin/sh

set -eu

TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
POSTGRES_HOST="${POSTGRES_HOST:-postgres-db}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-apollo}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-apollo123}"
POSTGRES_DB="${POSTGRES_DB:-apollo_test_db}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-32}"
POSTGRES_READY_TIMEOUT="${POSTGRES_READY_TIMEOUT:-60}"
BACKUP_FILE="${BACKUP_DIR}/${POSTGRES_DB}_${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"

export PGPASSWORD="${POSTGRES_PASSWORD}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Oczekiwanie na gotowosc Postgresa ${POSTGRES_HOST}:${POSTGRES_PORT}"

READY_COUNTER=0
until pg_isready -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null 2>&1; do
    READY_COUNTER=$((READY_COUNTER + 1))
    if [ "${READY_COUNTER}" -ge "${POSTGRES_READY_TIMEOUT}" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Blad: PostgreSQL nie jest gotowy po ${POSTGRES_READY_TIMEOUT} sekundach" >&2
        exit 1
    fi
    sleep 1
done

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Tworzenie backupu ${POSTGRES_DB}"

pg_dump \
    -h "${POSTGRES_HOST}" \
    -p "${POSTGRES_PORT}" \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    -Fc \
    -f "${BACKUP_FILE}"

find "${BACKUP_DIR}" -type f -name '*.dump' -mtime "+$((BACKUP_RETENTION_DAYS - 1))" -delete

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup zakonczony: ${BACKUP_FILE}"