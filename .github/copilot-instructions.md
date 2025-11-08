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

### Auth Dependencies (in `auth.py`)
```python
get_current_user()           # Any authenticated user
admin_required()             # Admin only
admin_or_hr_required()       # Admin or HR
can_manage_work_report()     # Owner, admin, or HR
```

## Database Schema & Validation

### Core Tables
- `users`: user_id (PK), email (unique), role, password_hash
- `projects`: project_id (PK), owner_user_id (FK), created_by_user_id (FK)
- `work_reports`: report_id (PK), user_id (FK), project_id (FK), work_date, hours_spent, minutes_spent
- `user_projects`: Many-to-many link between users and projects
- `messages`: Admin-created announcements shown to all users

### Time Validation Rules (Enforced in CRUD)
1. Single report: `0 ≤ hours ≤ 24`, `0 ≤ minutes < 60`, total cannot be 0h 0m
2. Daily sum per user: Cannot exceed 24 hours across all reports for same day
3. All summaries normalize minutes (e.g., 90 min → 1h 30m)
4. Users can only report time on projects they're assigned to (`user_projects` table)

## Frontend Structure & Patterns

### Directory Layout
```
frontend/
  index.html          # Login page (public)
  auth.js             # Shared auth module
  start/              # Worker panel (requires 'worker' role)
  user/               # User dashboard
  worker/             # Extended worker features
    reports/          # Report management
    summary/          # Time summaries
```

### Auth Pattern (in all protected pages)
```javascript
// Include auth.js in <head>
<script src="/auth.js"></script>

// Pages automatically check auth on load
// auth.js calls getCurrentUser(), verifies role, shows/hides content
// Redirects to /index.html if unauthorized
```

### API Call Pattern
```javascript
const token = localStorage.getItem('token');
const response = await fetch('/users/me', {
    headers: { 'Authorization': `Bearer ${token}` }
});
```

## Backend Code Patterns

### Router Structure (`routers/` directory)
Each router follows this pattern:
```python
from fastapi import APIRouter, Depends, HTTPException
from auth import get_current_user, admin_or_hr_required
from crud import create_*, get_*, update_*, delete_*

router = APIRouter()

@router.post("/", response_model=SchemaRead)
def create_endpoint(
    data: SchemaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_hr_required)
):
    try:
        result = create_function(db, data, current_user.user_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

### CRUD Layer (`crud.py`)
- All business logic and validation happens here
- Raise `ValueError` for validation errors (caught by routers as 400 errors)
- Use `IntegrityError` handling for FK constraint violations
- Complex aggregations (monthly summaries) implemented here with SQLAlchemy `func`

### Schema Pattern (`schemas.py`)
- `*Create`: Input validation (Pydantic models)
- `*Read`: Output serialization (with `from_attributes = True`)
- `*Update`: Partial update schemas

## Key Integration Points

### Nginx Reverse Proxy
`nginx/nginx.conf` routes:
- `/users/*` → `backend:8000/users/*`
- `/projects/*` → `backend:8000/projects/*`
- `/work_reports/*` → `backend:8000/work_reports/*`
- `/messages` → `backend:8000/messages`
- `/user_projects/*` → `backend:8000/user_projects/*`
- Everything else → Static frontend files

**Critical**: `proxy_set_header Authorization $http_authorization;` preserves JWT tokens

### Docker Networking
Services communicate via internal network:
- Backend connects to DB: `postgresql://apollo:apollo123@postgres-db:5432/apollo_test_db`
- Frontend calls backend via Nginx proxy (no direct connection)

## Project-Specific Conventions

1. **Polish Language**: All user-facing messages, comments, and documentation in Polish
2. **No Frontend Framework**: Pure vanilla JS - no React/Vue/Angular
3. **DB Migrations**: Tables auto-created by SQLAlchemy `Base.metadata.create_all()` (no Alembic in use)
4. **Error Messages**: Return descriptive Polish messages in HTTPException detail
5. **Timestamps**: Use timezone-aware timestamps (`DateTime(timezone=True)`)
6. **Email Normalization**: Always lowercase emails in CRUD operations

## Common Development Tasks

### Adding New Endpoint
1. Define schema in `schemas.py` (*Create, *Read models)
2. Add CRUD function in `crud.py` with validation
3. Create router endpoint in `routers/*.py` with auth dependency
4. Register router in `main.py` with `app.include_router()`
5. Update `ENDPOINT.md` permission matrix

### Modifying Database Schema
1. Update model in `models.py`
2. Either: Destroy containers and recreate, OR write manual ALTER statements
3. Update `DB_create.md` and `DB_opis.md` with changes
4. Rebuild backend container: `docker-compose up -d --build backend`

## Reference Documentation
- **Full API endpoints**: `docker/backend/ENDPOINT.md` (permission matrix)
- **Database schema**: `docker/DB_create.md` (SQL) and `docker/DB_opis.md` (descriptions)
- **Backend details**: `docker/backend/README.md`
- **Docker commands**: `docker/README.md`
