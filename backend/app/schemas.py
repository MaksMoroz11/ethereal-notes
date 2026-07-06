import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

LOGIN_PATTERN = re.compile(r"^[A-Za-z0-9_]+$")


class TaskCreate(BaseModel):
    board_id: int
    title: str
    description: str = ""
    status: str = "Открыта"
    tags: list[str] = []
    assignee_id: int | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    tags: list[str] | None = None
    assignee_id: int | None = None


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    board_id: int
    uid: str
    title: str
    description: str
    status: str
    tags: list[str]
    author_id: int
    assignee_id: int | None
    created_at: datetime
    updated_at: datetime


class UserCreate(BaseModel):
    login: str
    password: str

    @field_validator("login")
    @classmethod
    def login_latin(cls, value: str) -> str:
        if not LOGIN_PATTERN.match(value):
            raise ValueError("Логин: только латиница, цифры и _")
        return value


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    login: str
    created_at: datetime


class LoginRequest(BaseModel):
    login: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user: UserRead


class BoardCreate(BaseModel):
    title: str


class BoardUpdate(BaseModel):
    title: str | None = None


class BoardRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    created_at: datetime


class BoardWithTasks(BoardRead):
    tasks: list[TaskRead] = []
