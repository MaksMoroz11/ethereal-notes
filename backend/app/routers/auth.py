from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud
from app.database import get_db
from app.models import User
from app.schemas import AuthResponse, LoginRequest, UserCreate, UserRead
from app.security import verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

security = HTTPBearer()


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
    existing = await crud.get_user_by_email(db, data.email)
    if existing is not None:
        raise HTTPException(status_code=400, detail="Email уже занят")
    user = await crud.create_user(db, data)
    session = await crud.create_session(db, user)
    return {"token": session.token, "user": user}


@router.post("/login", response_model=AuthResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await crud.get_user_by_email(db, data.email)
    if user is None or not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")
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
