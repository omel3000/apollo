# Docker

| Komenda                    | Opis                                                                                     |
|---------------------------|------------------------------------------------------------------------------------------|
| `docker run`              | Uruchamia nowy kontener z podanego obrazu. Przykład: `docker run -d -p 80:80 nginx`       |
| `docker ps`               | Pokazuje listę działających kontenerów. Z opcją `-a` pokaże także zatrzymane              |
| `docker stop <ID_Kont.>`  | Zatrzymuje działający kontener.                                                          |
| `docker rm`               | Usuwa zatrzymany kontener.                                                               |
| `docker images`           | Wyświetla listę pobranych obrazów Docker na maszynie                                     |
| `docker rmi`              | Usuwa obraz Docker                                                                       |
| `docker build`            | Buduje obraz Docker z Dockerfile                                                        |
| `docker logs <ID_Kont.>`  | Wyświetla logi wybranego kontenera                                                      |
| `docker exec -it`         | Uruchamia interaktywną powłokę lub polecenie wewnątrz działającego kontenera              |
| `docker-compose up -d`    | Uruchamia kontenery według pliku `docker-compose.yml` w tle (detached mode)               |
| `docker-compose down`     | Zatrzymuje i usuwa kontenery zdefiniowane w `docker-compose.yml`                         |

---

# Postgres

Wejście do bazy TEST danych za pomocą:  

`docker exec -it postgres-db psql -U apollo -d apollo_test_db`

Wejście do bazy PROD:      

`docker exec -it postgres-db psql -U apollo -d apollo_prod_db`

---

# Struktura frontendu

- `/index.html` - Strona logowania (publiczna)
- `/start/` - Panel pracownika (wymaga zalogowania + rola 'worker')
- `/user/` - Panel użytkownika (wymaga zalogowania)
- `/worker/` - Rozszerzony panel pracownika (w budowie)

## Autoryzacja

System autoryzacji w `auth.js` obsługuje:
- Weryfikację tokenu JWT
- Sprawdzanie roli użytkownika
- Automatyczne przekierowania w zależności od uprawnień
- Różne komunikaty dla niezalogowanych i użytkowników bez wystarczających uprawnień

## Eksport struktury bazy danych

- `docker exec -t postgres-db pg_dump -U apollo -s apollo_test_db > struktura.sql`