from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TaskBase(BaseModel):
    uid: str
    title: str
    description: str = ""
    status: str = "Открыта"
    tags: list[str] = []
    author_id: int
    assignee_id: int | None = None


class TaskCreate(TaskBase):
    board_id: int


class TaskUpdate(BaseModel):
    uid: str | None = None
    title: str | None = None
    description: str | None = None
    status: str | None = None
    tags: list[str] | None = None
    author_id: int | None = None
    assignee_id: int | None = None


class TaskRead(TaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    board_id: int
    created_at: datetime
    updated_at: datetime


class UserBase(BaseModel):
    name: str
    email: str


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    password: str | None = None


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class LoginRequest(BaseModel):
    email: str
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
