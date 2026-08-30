import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

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


class MemberInvite(BaseModel):
    login: str


class MemberRoleUpdate(BaseModel):
    role: Literal["admin", "member"]


class WorkspaceMemberRead(BaseModel):
    user_id: int
    login: str
    role: str
    created_at: datetime


class WorkspaceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    owner_id: int
    role: str
    created_at: datetime


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Название не может быть пустым")
        return value


class WorkspaceUpdate(WorkspaceCreate):
    pass


class BoardCreate(BaseModel):
    title: str
    workspace_id: int


class BoardUpdate(BaseModel):
    title: str | None = None


class BoardRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    created_at: datetime


class BoardWithTasks(BoardRead):
    tasks: list[TaskRead] = []


class DocumentCreate(BaseModel):
    title: str
    workspace_id: int


class DocumentUpdate(BaseModel):
    title: str | None = None
    content: str | None = None


class DocumentVersionCreate(BaseModel):
    title: str
    content: str = ""


class DocumentVersionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    content: str
    author_login: str
    created_at: datetime


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    content: str
    author_login: str
    updated_by: str
    created_at: datetime
    updated_at: datetime
    versions: list[DocumentVersionRead] = []


class ActivityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    action: str
    entity_type: str
    entity_id: int | None
    title: str
    user_login: str
    created_at: datetime
