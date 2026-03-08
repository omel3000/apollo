FROM postgres:16-alpine

WORKDIR /app

RUN apk add --no-cache tzdata

COPY backup.sh /app/backup.sh
COPY entrypoint.sh /app/entrypoint.sh
COPY run_backup.sh /app/run_backup.sh

RUN chmod +x /app/backup.sh /app/entrypoint.sh /app/run_backup.sh

ENTRYPOINT ["/app/entrypoint.sh"]