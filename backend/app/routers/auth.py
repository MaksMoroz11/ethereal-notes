from datetime import datetime
from secrets import compare_digest

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud
from app.config import settings
from app.database import get_db
from app.errors import fail
from app.models import Consent, User
from app.schemas import AuthResponse, LoginRequest, UserCreate, UserRead
from app.security import decrypt_password, public_key_info, verify_and_update_password

router = APIRouter(prefix="/auth", tags=["auth"])
COOKIE_NAME = "ethereal_session"
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def check_origin(request: Request):
    origin = request.headers.get("origin")
    allowed = {value.strip() for value in settings.cors_origins.split(",")}
    if origin and origin not in allowed:
        fail(403, "csrf")


async def require_guest(request: Request, db: AsyncSession):
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return
    session = await crud.get_session_by_token(db, token)
    if session is not None:
        if session.expires_at > datetime.utcnow():
            fail(409, "already_authenticated")
        await crud.delete_session(db, session)


async def get_current_session(request: Request, db: AsyncSession = Depends(get_db, scope="function")):
    session = await crud.get_session_by_token(db, request.cookies.get(COOKIE_NAME, ""))
    if session is None or session.expires_at <= datetime.utcnow():
        fail(401, "unauthorized")
    if request.method not in SAFE_METHODS:
        check_origin(request)
        token = request.headers.get("x-csrf-token", "")
        if not token or not compare_digest(token, session.csrf_token):
            fail(403, "csrf")
    return session


async def get_current_user(session=Depends(get_current_session)) -> User:
    return session.user


def set_session_cookie(response: Response, session, remember: bool):
    response.set_cookie(COOKIE_NAME, session.token, httponly=True, secure=settings.cookie_secure,
                        samesite="lax", path="/", max_age=30 * 86400 if remember else None)
    response.headers["Cache-Control"] = "no-store"


@router.get("/public-key")
async def public_key():
    return public_key_info()


@router.get("/privacy")
async def privacy():
    return {"consent_version": settings.consent_version, "operator": settings.privacy_operator,
            "contact": settings.privacy_contact, "demo": not bool(settings.privacy_operator and settings.privacy_contact)}


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate, request: Request, response: Response, db: AsyncSession = Depends(get_db, scope="function")):
    check_origin(request)
    await require_guest(request, db)
    if data.consent_version != settings.consent_version:
        fail(422, "consent_outdated")
    try:
        password = decrypt_password(data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if len(password) < 4:
        fail(422, "password_short")
    if await crud.get_user_by_login(db, data.login) is not None:
        fail(400, "login_taken")
    user = await crud.create_user(db, data, password)
    db.add(Consent(user_id=user.id, version=settings.consent_version))
    session = await crud.create_session(db, user, data.remember)
    set_session_cookie(response, session, data.remember)
    return {"csrf_token": session.csrf_token, "user": user}


@router.post("/login", response_model=AuthResponse)
async def login(data: LoginRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db, scope="function")):
    check_origin(request)
    await require_guest(request, db)
    try:
        password = decrypt_password(data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    user = await crud.get_user_by_login(db, data.login)
    if user is None:
        fail(401, "invalid_credentials")
    valid, upgraded = verify_and_update_password(password, user.password)
    if not valid:
        fail(401, "invalid_credentials")
    if upgraded is not None:
        user.password = upgraded
    session = await crud.create_session(db, user, data.remember)
    set_session_cookie(response, session, data.remember)
    return {"csrf_token": session.csrf_token, "user": user}


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response, session=Depends(get_current_session), db: AsyncSession = Depends(get_db, scope="function")):
    await crud.delete_session(db, session)
    response.delete_cookie(COOKIE_NAME, path="/", secure=settings.cookie_secure, httponly=True, samesite="lax")


@router.get("/me", response_model=UserRead)
async def me(response: Response, user: User = Depends(get_current_user)):
    response.headers["Cache-Control"] = "no-store"
    return user


@router.get("/csrf")
async def csrf(response: Response, session=Depends(get_current_session)):
    response.headers["Cache-Control"] = "no-store"
    return {"csrf_token": session.csrf_token}
