from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud
from app.database import get_db
from app.models import User
from app.schemas import AuthResponse, LoginRequest, UserCreate, UserRead
from app.security import decrypt_password, public_key_info, verify_and_update_password

router = APIRouter(prefix="/auth", tags=["auth"])

security = HTTPBearer()


@router.get("/public-key")
async def public_key():
    return public_key_info()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    session = await crud.get_session_by_token(db, credentials.credentials)
    if session is None or session.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="Не авторизован")
    return session.user


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    try:
        password = decrypt_password(data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if len(password) < 4:
        raise HTTPException(status_code=422, detail="Пароль минимум 4 символа")
    existing = await crud.get_user_by_login(db, data.login)
    if existing is not None:
        raise HTTPException(status_code=400, detail="Логин уже занят")
    user = await crud.create_user(db, data, password)
    session = await crud.create_session(db, user)
    return {"token": session.token, "user": user}


@router.post("/login", response_model=AuthResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    try:
        password = decrypt_password(data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    user = await crud.get_user_by_login(db, data.login)
    if user is None:
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")
    valid, upgraded = verify_and_update_password(password, user.password)
    if not valid:
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")
    if upgraded is not None:
        user.password = upgraded
    session = await crud.create_session(db, user)
    return {"token": session.token, "user": user}


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    session = await crud.get_session_by_token(db, credentials.credentials)
    if session is not None:
        await crud.delete_session(db, session)


@router.get("/me", response_model=UserRead)
async def me(user: User = Depends(get_current_user)):
    return user
