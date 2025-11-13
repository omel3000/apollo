# Apollo Copilot Instructions

## Architecture
- `docker-compose.yml` runs `postgres-db`, `backend` (FastAPI), and `nginx-proxy`; static frontend under `frontend/` is mounted into Nginx, which also forwards `/users|/messages|/work_reports|/user_projects` to the backend while preserving the `Authorization` header.
- The FastAPI app lives in `backend/app/`; `main.py` wires routers for users, projects, work reports, messages, and user-project assignments, and eagerly runs `Base.metadata.create_all` against PostgreSQL.
- Core tables: `users`, `projects`, `user_projects`, `work_reports`, and `messages` (see `models.py`, `DB_create.md`); expect foreign keys between users ↔ projects and many-to-many assignments via `user_projects`.

## Backend Development
- Business logic resides in `crud.py`; routers catch `ValueError` and convert them into HTTP 400 responses—raise `ValueError` for domain violations instead of `HTTPException` in CRUD helpers.
- Auth lives in `auth.py` with bcrypt hashing and JWTs (`Authorization: Bearer …`). `get_current_user` also inspects the raw header to support Nginx; reuse it so new endpoints accept both standard OAuth2 and proxied headers.
- Role checks use `admin_required`, `admin_or_hr_required`, and `can_manage_work_report`; follow the same pattern for new privileged routes.
- `schemas.py` is Pydantic v2 style (`field_validator`, `model_validator`, `model_config`). Normalise emails to lowercase and enforce work report time rules (non-zero, ≤24h). Model responses configure `from_attributes=True` so you can return ORM objects directly.
- Time aggregation utilities (`get_monthly_summary`, `get_project_monthly_summary_*`) always normalise minutes into hours. Keep new aggregates consistent and update `ENDPOINT.md` when adding routes.

## Frontend Integration
- Worker UI loads through `/worker/*`. `auth-worker.js` redirects unless `/users/me` confirms role `worker`; any new worker page should include that script before manipulating the DOM.
- `worker/reports/reports.js` expects `window.currentDate` from `date-navigator.js` and posts JSON `{project_id, work_date, hours_spent, minutes_spent, description}` to `/work_reports/`; keep response shapes aligned with `WorkReportRead`.
- Project dropdowns rely on `GET /user_projects/my_projects` returning `ProjectRead` fields (`project_id`, `project_name`). Preserve these keys when adjusting backend serializers.
- Frontend fetch calls pass the stored token or prepend `Bearer ` if missing; replicate this logic when adding new requests so legacy tokens keep working.

## Workflows
- Start the full stack with `docker-compose up -d`; backend reloads automatically via Uvicorn `--reload` mapped to the host volume.
- For focused backend work, run `uvicorn main:app --reload --host 0.0.0.0 --port 8000` from `backend/app` with `DATABASE_URL` pointing at Postgres (e.g. via `docker exec -it backend bash`).
- Connect to Postgres for manual checks using `docker exec -it postgres-db psql -U apollo -d apollo_test_db` (or `apollo_prod_db` in production); schema docs live in `DB_opis.md`.

## Conventions & References
- Update `backend/ENDPOINT.md` whenever routes or permissions change; it is the authoritative access matrix for admins vs HR vs workers.
- Polish naming conventions surface in messages and UI—reuse existing phrasing for consistency.
- No automated tests are present; validate changes by calling the relevant endpoints (e.g. `POST /work_reports` followed by `GET /work_reports`) or exercising the worker UI via the browser.
- Sensitive defaults (JWT `SECRET_KEY`, DB credentials) are expected from environment variables; avoid hardcoding secrets and extend `.env` handling when introducing new settings.
