from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Set, Tuple
from urllib.parse import parse_qs

from fastapi import HTTPException, Request
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from starlette.middleware.base import BaseHTTPMiddleware

from auth import ALGORITHM, SECRET_KEY
from database import SessionLocal
from models import AuditLog, User

MAX_DETAIL_LENGTH = 1800
SENSITIVE_KEYS = {
    "password",
    "current_password",
    "new_password",
    "confirm_new_password",
    "token",
}
IGNORED_PREFIXES = {"/docs", "/openapi", "/redoc"}
IGNORED_METHODS = {"GET", "OPTIONS", "HEAD"}


def _mask_sensitive(payload: Any) -> Any:
    if isinstance(payload, dict):
        clean: Dict[str, Any] = {}
        for key, value in payload.items():
            if key.lower() in SENSITIVE_KEYS:
                clean[key] = "***"
            else:
                clean[key] = _mask_sensitive(value)
        return clean
    if isinstance(payload, list):
        return [_mask_sensitive(item) for item in payload]
    return payload


def _truncate(text: str) -> str:
    if len(text) <= MAX_DETAIL_LENGTH:
        return text
    return text[:MAX_DETAIL_LENGTH] + "..."


class AuditLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware zapisujący każdy request użytkownika do tabeli audit_logs."""

    def __init__(self, app, ignored_paths: Optional[Set[str]] = None):
        super().__init__(app)
        self.ignored_paths = ignored_paths or set()
        self.logger = logging.getLogger("apollo.audit")

    async def dispatch(self, request: Request, call_next):
        method = request.method.upper()
        if method in IGNORED_METHODS:
            return await call_next(request)
        path = request.url.path
        if self._should_skip(path):
            return await call_next(request)

        started_at = datetime.now(timezone.utc)
        body_summary = await self._extract_body_summary(request)
        query_summary = request.url.query or None
        action_group, entity_type, entity_id = self._normalize_action(request)

        db = SessionLocal()
        user = self._resolve_user(request, db)
        status_code = 500
        response = None
        error_detail: Optional[str] = None

        try:
            response = await call_next(request)
            status_code = response.status_code
            return response
        except HTTPException as exc:  # re-raise but zapamiętaj detal
            status_code = exc.status_code
            error_detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
            raise
        except Exception as exc:  # pylint: disable=broad-except
            status_code = 500
            error_detail = str(exc)
            raise
        finally:
            try:
                if not self._should_skip(path):
                    self._persist_log(
                        db=db,
                        request=request,
                        user=user,
                        status_code=status_code,
                        started_at=started_at,
                        query_summary=query_summary,
                        body_summary=body_summary,
                        error_detail=error_detail,
                        action_group=action_group,
                        entity_type=entity_type,
                        entity_id=entity_id,
                    )
                    db.commit()
            except Exception as log_exc:  # pylint: disable=broad-except
                db.rollback()
                self.logger.error("Nie udało się zapisać logu audytu: %s", log_exc)
            finally:
                db.close()

    def _should_skip(self, path: str) -> bool:
        if path in self.ignored_paths:
            return True
        return any(path.startswith(prefix) for prefix in IGNORED_PREFIXES)

    def _normalize_action(self, request: Request) -> Tuple[str, Optional[str], Optional[int]]:
        path = request.url.path
        stripped = path.strip("/")
        segments = [segment for segment in stripped.split("/") if segment]
        normalized_segments: list[str] = []
        entity_type: Optional[str] = None
        entity_id: Optional[int] = None
        previous_segment: Optional[str] = None

        for segment in segments:
            if segment.isdigit():
                if entity_type is None and previous_segment:
                    entity_type = previous_segment
                if entity_id is None:
                    entity_id = int(segment)
                previous_segment = segment
                continue
            normalized_segments.append(segment)
            previous_segment = segment

        normalized_path = "/" + "/".join(normalized_segments) if normalized_segments else "/"
        if path.endswith("/") and not normalized_path.endswith("/"):
            normalized_path += "/"

        action_group = f"{request.method.upper()} {normalized_path}"
        return action_group, entity_type, entity_id

    async def _extract_body_summary(self, request: Request) -> Optional[str]:
        try:
            body_bytes = await request.body()
        except Exception:  # pylint: disable=broad-except
            return None
        if not body_bytes:
            return None
        content_type = request.headers.get("content-type", "").lower()
        text_payload: Optional[str] = None
        try:
            if "application/json" in content_type:
                parsed = json.loads(body_bytes)
                sanitized = _mask_sensitive(parsed)
                text_payload = json.dumps(sanitized, ensure_ascii=False)
            elif "application/x-www-form-urlencoded" in content_type:
                parsed_form = parse_qs(body_bytes.decode("utf-8", errors="ignore"))
                sanitized_form = {
                    key: ["***" if key.lower() in SENSITIVE_KEYS else value for value in values]
                    for key, values in parsed_form.items()
                }
                text_payload = json.dumps(sanitized_form, ensure_ascii=False)
            else:
                text_payload = body_bytes.decode("utf-8", errors="ignore")
        except Exception:  # pylint: disable=broad-except
            text_payload = body_bytes.decode("utf-8", errors="ignore")
        return _truncate(text_payload) if text_payload else None

    def _resolve_user(self, request: Request, db: Session) -> Optional[User]:
        auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
        if not auth_header or not auth_header.lower().startswith("bearer "):
            return None
        token = auth_header.split(" ", 1)[1].strip()
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            if user_id is None:
                return None
            return db.query(User).filter(User.user_id == int(user_id)).first()
        except (JWTError, ValueError):
            return None

    def _persist_log(
        self,
        db: Session,
        request: Request,
        user: Optional[User],
        status_code: int,
        started_at: datetime,
        query_summary: Optional[str],
        body_summary: Optional[str],
        error_detail: Optional[str],
        action_group: Optional[str],
        entity_type: Optional[str],
        entity_id: Optional[int],
    ) -> None:
        duration_ms = int((datetime.now(timezone.utc) - started_at).total_seconds() * 1000)
        detail_parts = []
        if query_summary:
            detail_parts.append(f"parametry={query_summary}")
        if body_summary:
            detail_parts.append(f"payload={body_summary}")
        if error_detail:
            detail_parts.append(f"blad={_truncate(error_detail)}")
        if entity_type and entity_id is not None:
            detail_parts.append(f"encja={entity_type}:{entity_id}")
        detail = " | ".join(detail_parts) if detail_parts else None

        log_entry = AuditLog(
            user_id=user.user_id if user else None,
            user_email=user.email if user else None,
            user_role=user.role if user else None,
            action=f"{request.method} {request.url.path}",
            action_group=action_group,
            method=request.method,
            path=request.url.path,
            status_code=status_code,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            entity_type=entity_type,
            entity_id=entity_id,
            detail=detail,
            duration_ms=duration_ms,
        )
        db.add(log_entry)
