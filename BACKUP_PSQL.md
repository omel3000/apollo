# Backup PostgreSQL

Ten mechanizm zapisuje lokalne backupy bazy PostgreSQL do katalogu `backup_psql` w katalogu głównym repozytorium.

Backup działa automatycznie jako osobna usługa Docker Compose. Po pobraniu repozytorium i uruchomieniu stacku nie trzeba już osobno konfigurować `cron` na serwerze.

## Co robi skrypt

- usługa `postgres-backup` uruchamia harmonogram backupów wewnątrz kontenera
- tworzy backup bazy PostgreSQL codziennie o 03:00
- zapisuje plik w formacie `pg_dump -Fc`
- nadaje nazwę z datą i godziną wykonania
- usuwa backupy starsze niż 32 dni

## Lokalizacja backupów

Backupy są zapisywane w katalogu:

```bash
backup_psql/
```

Przykładowa nazwa pliku:

```bash
apollo_prod_db_2026-03-08_03-00-00.dump
```

## Ręczne uruchomienie

Na serwerze, z katalogu repozytorium:

```bash
bash scripts/backup_postgres.sh
```

Jeżeli skrypt ma już uprawnienie do wykonania:

```bash
./scripts/backup_postgres.sh
```

Ten skrypt nadal zostaje jako ręczny tryb awaryjny albo do testów.

## Automatyczne uruchamianie codziennie o 03:00

Wystarczy uruchomić cały stack Docker Compose:

```bash
cd docker
docker-compose up -d --build
```

Od tego momentu kontener `postgres-backup` sam wykona backup codziennie o 03:00 i będzie czyścił pliki starsze niż 32 dni.

Nie trzeba dodawać żadnego wpisu do systemowego `cron` na serwerze.

## Konfiguracja harmonogramu

Ustawienia są w `docker/.env` i przykłady w `docker/.env.example`:

```bash
BACKUP_CRON=0 3 * * *
BACKUP_RETENTION_DAYS=32
BACKUP_RUN_ON_STARTUP=false
TZ=Europe/Warsaw
```

- `BACKUP_CRON` określa godzinę wykonywania backupu
- `BACKUP_RETENTION_DAYS` określa ile dni pliki mają być trzymane
- `BACKUP_RUN_ON_STARTUP=true` wymusza dodatkowy backup od razu po starcie kontenera, ale tylko raz dziennie
- `TZ` ustawia strefę czasową dla harmonogramu

## Jak działa retencja 32 dni

Po każdym backupie skrypt usuwa pliki `.dump`, które są starsze niż 32 dni. Dzięki temu katalog `backup_psql` nie będzie przechowywał starszych kopii.

## Odzyskanie bazy z backupu

Przykład odtworzenia backupu do działającego kontenera PostgreSQL:

```bash
docker cp backup_psql/nazwa_pliku.dump postgres-db:/tmp/restore.dump
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" postgres-db dropdb -h 127.0.0.1 -U "$POSTGRES_USER" --if-exists "$POSTGRES_DB"
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" postgres-db createdb -h 127.0.0.1 -U "$POSTGRES_USER" "$POSTGRES_DB"
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" postgres-db pg_restore -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists /tmp/restore.dump
docker exec postgres-db rm -f /tmp/restore.dump
```

## Rozszerzenie w przyszłości

Docelowo możesz dodać drugi krok po utworzeniu backupu:

- synchronizację katalogu `backup_psql` na inny serwer przez `rsync`
- wysyłkę do storage S3 przez `rclone`

Obecny układ jest pod to przygotowany, bo wszystkie pliki trafiają do jednego katalogu.