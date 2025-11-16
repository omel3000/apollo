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
- Rebuild after schema/model changes: `docker-compose up -d --build backend`

## Authentication & Authorization

### JWT Token Flow
1. Login: `POST /users/login` returns JWT token
2. Frontend stores token in `localStorage`
3. All authenticated requests include `Authorization: Bearer <token>` header
4. Nginx proxies API routes to backend with `proxy_set_header Authorization $http_authorization;`

### Role-Based Access (3 roles)
- **user**: Can only manage own work reports
- **hr**: Full read access + user/project management (cannot manage admin users)
- **admin**: Full system access including admin user management

**Admin-only operations** (enforced in routers):
- Creating/editing users with role `"admin"`
- Editing/deleting users who have role `"admin"`
- Creating system messages (`POST /messages`)

### Auth Dependencies Pattern
Use these in routers (`auth.py`):
```python
from auth import get_current_user, admin_required, admin_or_hr_required

# Any authenticated user
@router.get("/endpoint")
def handler(current_user: User = Depends(get_current_user)):
    
# Admin or HR only
@router.get("/endpoint")
def handler(current_user: User = Depends(admin_or_hr_required)):

# Admin only
@router.post("/endpoint")  
def handler(current_user: User = Depends(admin_required)):
```

## Project-Specific Conventions

### Language & Localization
**CRITICAL**: All user-facing text, comments, error messages, and documentation MUST be in Polish.
- Exception messages: `raise ValueError("Nie można usunąć użytkownika...")`
- HTTP responses: `detail="Nieprawidłowe dane logowania"`
- Frontend labels, buttons, messages: Always Polish
- Code variable names: English OK, but all text content Polish

### No Migration Tools
- Database schema is created via `Base.metadata.create_all()` in `main.py`
- **DO NOT** use Alembic or other migration tools
- Schema changes require backend rebuild: `docker-compose up -d --build backend`

### Frontend: Vanilla JS Only
- **NO frameworks** (no React, Vue, Angular, etc.)
- Pure HTML/CSS/JavaScript in `docker/frontend/` directory
- Role-specific auth guards (see `auth-worker.js`, `auth-hr.js` patterns):
  ```javascript
  const token = localStorage.getItem('token');
  const resp = await fetch('/users/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const user = await resp.json();
  if (user.role !== 'worker') window.location.replace('/');
  ```

## Backend Coding Patterns

### Error Handling Architecture
**Critical pattern**: Business logic in `crud.py` raises `ValueError`, routers catch and convert to HTTP 400:

```python
# In crud.py - validation logic
def create_work_report(db: Session, report: WorkReportCreate):
    if report.hours_spent == 0 and report.minutes_spent == 0:
        raise ValueError("Raport musi mieć niezerowy czas")
    # ... more validation
    
# In routers/work_reports.py - error handling
@router.post("/")
def create_report(report: WorkReportCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_work_report(db, report)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

### Foreign Key Violations
Handle `IntegrityError` when deleting with dependencies:
```python
from sqlalchemy.exc import IntegrityError

try:
    db.delete(project)
    db.commit()
except IntegrityError:
    db.rollback()
    raise ValueError("Nie można usunąć projektu: istnieją powiązane raporty pracy")
```

### Pydantic Schema Patterns
Use Pydantic v2 style with consistent naming:
- `*Create` - for POST input (includes `password` for users)
- `*Read` - for response output (includes generated fields like `user_id`, `created_at`)
- `*Update` - for PUT/PATCH input (all fields Optional)

Example validation patterns from `schemas.py`:
```python
class UserCreate(UserBase):
    password: str
    
    @field_validator("email", mode="before")
    def normalize_email(cls, v):
        return v.strip().lower() if isinstance(v, str) else v

class UserRead(UserBase):
    user_id: int
    registration_date: datetime
    account_status: str
    model_config = {"from_attributes": True}  # allows ORM objects
```

### Time Validation Rules
Implemented in `crud.py` for work reports:
- Single report: `0 ≤ hours ≤ 24`, `0 ≤ minutes < 60`, total cannot be `0h 0m`
- Daily sum per user cannot exceed 24 hours
- Time normalization: 90 minutes → 1 hour 30 minutes (apply in aggregations)
- Users can only report time on projects they're assigned to (`user_projects` table)

## Data Model Architecture

### Core Tables (see `models.py`)
- `users` - email (unique), password_hash, role, account_status
- `projects` - project_name, owner_user_id, time_type (enum: constant/from_to)
- `user_projects` - many-to-many linking users to projects
- `work_reports` - user_id, project_id, work_date, hours_spent, minutes_spent
- `messages` - title, content, is_active (for system announcements)
- `availability`, `absences`, `schedule` - newer features for HR module

### TimeType Enum
Projects have `time_type` field:
- `constant` - report total hours/minutes spent
- `from_to` - report time_from and time_to (start/end times)

## Nginx Proxy Configuration

All API routes are proxied from frontend to backend. When adding new routers, update `nginx/nginx.conf`:
```nginx
location /new_endpoint/ {
    proxy_pass http://backend:8000/new_endpoint/;
    proxy_set_header Authorization $http_authorization;  # CRITICAL
    # ... other headers
}
```

## Adding New Endpoints - Checklist

1. **Define Pydantic schemas** in `schemas.py` (*Create, *Read, *Update)
2. **Add CRUD functions** in `crud.py` with business validation (raise `ValueError`)
3. **Create router** in `routers/` with proper auth dependency
4. **Handle ValueError** in router (convert to HTTP 400)
5. **Register router** in `main.py`: `app.include_router(new_router, prefix="/endpoint", tags=["Tag"])`
6. **Update Nginx config** if frontend needs to call it
7. **Update `ENDPOINT.md`** with permission matrix (user/hr/admin access)

## Frontend Patterns

### Role-Based Page Guards
Each role-specific directory (`worker/`, `hr/`) has `auth-{role}.js`:
```javascript
(async function enforceWorkerAuth() {
  const token = localStorage.getItem('token');
  if (!token) { window.location.replace('/'); return; }
  
  const resp = await fetch('/users/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!resp.ok) { window.location.replace('/'); return; }
  
  const user = await resp.json();
  if (user.role !== 'worker') { window.location.replace('/'); return; }
  
  document.documentElement.style.visibility = 'visible';
})();
```

### API Fetch Pattern
Always include auth header:
```javascript
const token = localStorage.getItem('token');
const response = await fetch('/work_reports/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    project_id: 1,
    work_date: '2025-11-16',
    hours_spent: 2,
    minutes_spent: 30,
    description: 'Opis pracy'
  })
});
```

## Testing Strategy

### No Automated Tests
This project **does not use automated tests**. Validate changes manually:

1. **API Testing** - Use FastAPI auto-generated docs:
   ```
   http://localhost:8000/docs
   ```
   - Test endpoints directly in Swagger UI
   - Check response shapes match Pydantic schemas
   - Verify error handling (400 for validation, 401 for auth, 403 for permissions)

2. **Frontend Testing** - Browser-based validation:
   - Test role-based access (worker vs hr vs admin pages)
   - Verify auth flows (login, logout, token refresh)
   - Check Polish text in UI and error messages
   - Test form validation and API integration

3. **Database Validation** - Direct SQL queries:
   ```bash
   docker exec -it postgres-db psql -U apollo -d apollo_test_db
   \dt  # list tables
   SELECT * FROM users;
   SELECT * FROM work_reports WHERE user_id = 1;
   ```

4. **Common Test Scenarios**:
   - Create user with each role → verify permissions
   - Create work report → check 24h daily limit validation
   - Delete project with reports → verify IntegrityError handling
   - Assign user to project → create work report → verify access control

5. **Backend Logs**:
   ```bash
   docker logs backend -f  # follow backend logs
   ```
   Watch for validation errors, SQL queries, and auth warnings

## Environment Variables & Configuration

### Environment Setup
Configuration managed via environment variables in `docker/.env` (create if missing):

```bash
# Database Configuration
POSTGRES_USER=apollo
POSTGRES_PASSWORD=apollo123
POSTGRES_DB=apollo_test_db  # or apollo_prod_db for production

# Backend Configuration
DATABASE_URL=postgresql://apollo:apollo123@postgres-db:5432/apollo_test_db
SECRET_KEY=supersekretnykluczdojwt  # CHANGE IN PRODUCTION!
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

### Key Settings Explained

**Database Variables** (used by `postgres-db` container):
- `POSTGRES_USER` - PostgreSQL username (default: apollo)
- `POSTGRES_PASSWORD` - Database password (default: apollo123)
- `POSTGRES_DB` - Database name (test: apollo_test_db, prod: apollo_prod_db)

**Backend Variables** (used by FastAPI app):
- `DATABASE_URL` - Full connection string to PostgreSQL
  - Format: `postgresql://user:password@host:port/database`
  - Host is `postgres-db` (Docker service name)
- `SECRET_KEY` - JWT signing secret (MUST change in production)
  - Used in `auth.py` for token creation/validation
  - Longer, random string recommended for security
- `ACCESS_TOKEN_EXPIRE_MINUTES` - JWT token lifetime (default: 60 minutes)
  - Tokens expire after this duration
  - Users must re-login when expired

### Switching Databases

To switch between test and production databases:

1. **Update `docker/.env`**:
   ```bash
   POSTGRES_DB=apollo_prod_db
   DATABASE_URL=postgresql://apollo:apollo123@postgres-db:5432/apollo_prod_db
   ```

2. **Restart services**:
   ```bash
   cd docker
   docker-compose down
   docker-compose up -d
   ```

3. **Schema auto-created** on first backend startup via `Base.metadata.create_all()`

### Security Notes
- **Never commit `.env`** to version control (add to `.gitignore`)
- **Change `SECRET_KEY`** in production to long random string (32+ characters)
- **Use strong passwords** for `POSTGRES_PASSWORD` in production
- Database port not exposed to host (security by design)

## Summary of Key Patterns

When implementing features, reference these key files:
- **Auth patterns**: `docker/backend/app/auth.py`
- **Business logic**: `docker/backend/app/crud.py`
- **API routes**: `docker/backend/app/routers/*.py`
- **Permission matrix**: `docker/backend/ENDPOINT.md`
- **Proxy config**: `docker/nginx/nginx.conf`
- **Frontend auth**: `docker/frontend/worker/auth-worker.js`, `docker/frontend/hr/auth-hr.js`
- **Data models**: `docker/backend/app/models.py`
- **Schemas**: `docker/backend/app/schemas.py`
