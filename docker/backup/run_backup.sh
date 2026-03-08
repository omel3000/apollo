#!/bin/sh

set -eu

set -a
. /app/backup.env
set +a

/app/backup.sh