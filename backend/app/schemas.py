import re
from datetime import datetime
from uuid import UUID
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

LOGIN_PATTERN = re.compile(r"^[A-Za-z0-9_]+$")


class NamedModel(BaseModel):
    @field_validator("title", check_fields=False)
    @classmethod
    def title_not_blank(cls, value: str) -> str:
        if value is None or not value.strip():
            raise ValueError("Название не может быть пустым")
        return value.strip()


class RequiredPatchFields(NamedModel):
    @field_validator("description", "tags", "content", "column_id", "position", check_fields=False)
    @classmethod
    def reject_null(cls, value):
        if value is None:
            raise ValueError("Поле не может быть null")
        return value


class TaskCreate(NamedModel):
    board_id: int
    column_id: UUID
    title: str
    description: str = ""
    tags: list[str] = []
    assignee_id: int | None = None


class TaskUpdate(RequiredPatchFields):
    title: str | None = None
    description: str | None = None
    column_id: UUID | None = None
    tags: list[str] | None = None
    assignee_id: int | None = None


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    board_id: int
    column_id: UUID
    uid: str
    title: str
    description: str
    tags: list[str]
    author_id: int
    assignee_id: int | None
    created_at: datetime
    updated_at: datetime


class UserCreate(BaseModel):
    login: str
    key_id: str
    encrypted_key: str
    nonce: str
    encrypted_password: str

    @field_validator("login")
    @classmethod
    def login_latin(cls, value: str) -> str:
        if not LOGIN_PATTERN.fullmatch(value):
            raise ValueError("Логин: только латиница, цифры и _")
        return value


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    login: str
    created_at: datetime


class LoginRequest(BaseModel):
    login: str
    key_id: str
    encrypted_key: str
    nonce: str
    encrypted_password: str


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


class BoardCreate(NamedModel):
    title: str
    workspace_id: int
    folder_id: UUID | None = None


class BoardUpdate(NamedModel):
    title: str | None = None
    folder_id: UUID | None = None


class ColumnCreate(NamedModel):
    title: str = Field(min_length=1, max_length=120)


class ColumnUpdate(RequiredPatchFields):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    position: int | None = Field(default=None, ge=0)


class ColumnDelete(BaseModel):
    target_column_id: UUID | None = None


class ColumnRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    board_id: int
    title: str
    position: int


class BoardRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    folder_id: UUID | None
    created_at: datetime
    columns: list[ColumnRead] = []


class BoardWithTasks(BoardRead):
    tasks: list[TaskRead] = []


class DocumentCreate(NamedModel):
    title: str
    workspace_id: int
    folder_id: UUID | None = None


class DocumentUpdate(RequiredPatchFields):
    title: str | None = None
    content: str | None = None
    folder_id: UUID | None = None


class FolderCreate(NamedModel):
    workspace_id: int
    kind: Literal["board", "document"] = "board"
    parent_id: UUID | None = None
    title: str = Field(min_length=1, max_length=120)


class FolderUpdate(NamedModel):
    parent_id: UUID | None = None
    title: str | None = Field(default=None, min_length=1, max_length=120)


class FolderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workspace_id: int
    kind: Literal["board", "document"]
    parent_id: UUID | None
    title: str
    created_at: datetime


class DocumentVersionCreate(NamedModel):
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

    id: UUID
    title: str
    content: str
    folder_id: UUID | None
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
    entity_id: str | None
    title: str
    user_login: str
    created_at: datetime


class SearchResult(BaseModel):
    entity_type: Literal["task", "document"]
    id: UUID
    folder_id: UUID | None = None
    board_id: int | None = None
    title: str
    user_login: str
    created_at: datetime
