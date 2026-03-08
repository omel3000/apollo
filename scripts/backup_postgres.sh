#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKUP_DIR="${PROJECT_ROOT}/backup_psql"
ENV_FILE="${PROJECT_ROOT}/docker/.env"
CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-postgres-db}"
TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"

if [[ -f "${ENV_FILE}" ]]; then
    set -a
    # shellcheck disable=SC1090
    . "${ENV_FILE}"
    set +a
fi

POSTGRES_USER="${POSTGRES_USER:-apollo}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-apollo123}"
POSTGRES_DB="${POSTGRES_DB:-apollo_test_db}"

BACKUP_FILE="${BACKUP_DIR}/${POSTGRES_DB}_${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"

cleanup() {
    docker exec "${CONTAINER_NAME}" rm -f /tmp/backup.dump >/dev/null 2>&1 || true
}

if ! command -v docker >/dev/null 2>&1; then
    echo "Blad: nie znaleziono polecenia docker." >&2
    exit 1
fi

if [[ "$(docker inspect -f '{{.State.Running}}' "${CONTAINER_NAME}" 2>/dev/null || true)" != "true" ]]; then
    echo "Blad: kontener ${CONTAINER_NAME} nie istnieje lub nie jest uruchomiony." >&2
    exit 1
fi

trap cleanup EXIT

echo "Tworzenie backupu bazy ${POSTGRES_DB} do ${BACKUP_FILE}"

docker exec \
    -e PGPASSWORD="${POSTGRES_PASSWORD}" \
    "${CONTAINER_NAME}" \
    pg_dump \
    -h 127.0.0.1 \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    -Fc \
    -f "/tmp/backup.dump"

docker cp "${CONTAINER_NAME}:/tmp/backup.dump" "${BACKUP_FILE}"

find "${BACKUP_DIR}" -daystart -type f -name '*.dump' -mtime +31 -delete

echo "Backup zakonczony powodzeniem: ${BACKUP_FILE}"
