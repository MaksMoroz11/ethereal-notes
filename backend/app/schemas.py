from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TaskBase(BaseModel):
    uid: str
    title: str
    description: str = ""
    status: str = "Открыта"
    tags: list[str] = []
    author_name: str
    assignee_name: str | None = None


class TaskCreate(TaskBase):
    board_id: int


class TaskUpdate(BaseModel):
    uid: str | None = None
    title: str | None = None
    description: str | None = None
    status: str | None = None
    tags: list[str] | None = None
    author_name: str | None = None
    assignee_name: str | None = None


class TaskRead(TaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    board_id: int
    created_at: datetime
    updated_at: datetime


class BoardCreate(BaseModel):
    title: str


class BoardRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    created_at: datetime


class BoardWithTasks(BoardRead):
    tasks: list[TaskRead] = []
