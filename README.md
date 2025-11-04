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

# GIT

| Komenda                           | Opis                                                      |
|----------------------------------|-----------------------------------------------------------|
| `git add <file_name>`             | Dodajemy nowy plik lub zmiany do obszaru staging          |
| `git commit -m "<komentarz>"`    | Zatwierdzamy zmiany z komentarzem                          |
| `git push -u origin main`         | Wysyłamy zmiany do zdalnego repo na gałąź główną (main)    |
| `git pull`                       | Pobieramy i scalamy zmiany ze zdalnego repo                |
| `git remote add origin <url>`    | Dodajemy zdalne repozytorium o nazwie "origin"             |
| `git branch`                    | Pokazuje listę gałęzi w repozytorium lub zarządza nimi     |


---

# Postgres

Wejście do bazy TEST danych za pomocą:  

`docker exec -it postgres-db psql -U apollo -d apollo_test_db`

Wejście do bazy PROD:      

`docker exec -it postgres-db psql -U apollo -d apollo_prod_db`
