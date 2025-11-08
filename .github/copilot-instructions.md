# Apollo Project - AI Coding Agent Instructions

## Architecture Overview

Apollo is a **time tracking & project management system** with a 3-tier Docker architecture:
- **Frontend**: Vanilla JS/HTML/CSS (no framework) served by Nginx
- **Backend**: FastAPI (Python) with SQLAlchemy ORM
- **Database**: PostgreSQL 16

All services run in Docker containers orchestrated by `docker-compose.yml` in the `/docker` directory.

## Critical Workflows

### Starting the Application
```bash
cd docker
docker-compose up -d
```
- Frontend: `http://localhost/` (Nginx on port 80)
- Backend API: `http://localhost:8000` (FastAPI)
- Database: Not exposed to host (internal network only)

### Database Access
```bash
# Test DB
docker exec -it postgres-db psql -U apollo -d apollo_test_db

# Production DB  
docker exec -it postgres-db psql -U apollo -d apollo_prod_db
```

### Backend Development
- Live reload: Changes in `docker/backend/app/` are auto-reflected (volume mount)
- Dependencies: Listed in `docker/backend/requirements.txt`
- API docs: `http://localhost:8000/docs` (auto-generated Swagger)

## Authentication & Authorization

### JWT Token Flow
1. Login: `POST /users/login` returns JWT token
2. Frontend stores token in `localStorage`
3. All authenticated requests include `Authorization: Bearer <token>` header
4. Nginx proxies `/users/*`, `/messages`, `/projects/*`, `/work_reports/*`, `/user_projects/*` to backend with Authorization header preserved

### Role-Based Access (3 roles)
- **user**: Can only manage own work reports
- **hr**: Full read access + user/project management (cannot manage admin users)
- **admin**: Full system access including admin user management

**Critical**: Only admins can create/edit/delete admin users. See `docker/backend/ENDPOINT.md` for complete permission matrix.
## Apollo — AI agent quick guide

Short, actionable notes to get productive in this repo. Preserve Polish messages and repo conventions.

- Architecture: three services in Docker (Nginx frontend static files, FastAPI backend, Postgres DB). See `docker/docker-compose.yml` and `nginx/nginx.conf`.
- Start locally: from repository root run `cd docker; docker-compose up -d`. Frontend: http://localhost/; backend: http://localhost:8000/.

- Key backend files (FastAPI): `docker/backend/app/main.py`, `auth.py`, `crud.py`, `models.py`, `schemas.py`, and `routers/` (users, projects, work_reports, user_projects, messages).
- Conventions to follow strictly:
    - All user-facing text, comments and docs must be in Polish.
    - No frontend frameworks: vanilla JS in `frontend/` and `docker/frontend/` (see `auth.js` use for auth pattern).
    - DB tables are created via SQLAlchemy `Base.metadata.create_all()` — no Alembic.

- Auth & API patterns (copy examples exactly):
    - JWT flow: `POST /users/login` → token stored in `localStorage`; include `Authorization: Bearer <token>` on requests.
    - Nginx must forward auth header: `proxy_set_header Authorization $http_authorization;` (see `nginx/nginx.conf`).
    - Common fetch pattern (frontend):
        const token = localStorage.getItem('token');
        await fetch('/users/me', { headers: { 'Authorization': `Bearer ${token}` } });

- Backend coding patterns you must mirror:
    - Routers call CRUD functions; routers catch `ValueError` and return HTTP 400. (See `routers/*.py`.)
    - Business validation belongs in `crud.py` (raise `ValueError` for validation). Use SQLAlchemy `IntegrityError` handling for FK/unique violations.
    - Pydantic schemas: `*Create` for input, `*Read` for output, `*Update` for partial updates (`schemas.py`).

- Domain-specific rules to preserve (implementations live in `crud.py`):
    - Time constraints: single report 0 ≤ hours ≤ 24, 0 ≤ minutes < 60, total != 0; daily sum per user ≤ 24h; minutes normalized (e.g., 90m → 1h30m).
    - Users can report time only on projects they belong to (`user_projects` link table).

- Dev workflows & useful commands:
    - Start services: `cd docker; docker-compose up -d` (live code volume mounts for backend allow quick iteration).
    - Rebuild backend after model/schema changes: `docker-compose up -d --build backend`.
    - Access DB inside container: `docker exec -it postgres-db psql -U apollo -d apollo_test_db`.

- When adding endpoints: add schemas → add crud validation → add router with auth dependency → include in `main.py` → update `docker/backend/ENDPOINT.md` permission matrix.

- Files to reference while coding: `docker/backend/app/auth.py`, `crud.py`, `routers/*.py`, `docker/backend/ENDPOINT.md`, `nginx/nginx.conf`, `frontend/auth.js`.

If anything here is unclear or you'd like more detail (examples, tests, or small edits to a file), tell me which area to expand. 
```javascript
