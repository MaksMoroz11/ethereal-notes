from datetime import datetime

from sqlalchemy import ForeignKey, func
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Board(Base):
    __tablename__ = "boards"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    tasks: Mapped[list["Task"]] = relationship(back_populates="board", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    board_id: Mapped[int] = mapped_column(ForeignKey("boards.id"))
    uid: Mapped[str] = mapped_column()
    title: Mapped[str] = mapped_column()
    description: Mapped[str] = mapped_column(default="")
    status: Mapped[str] = mapped_column(default="Открыта")
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    author_name: Mapped[str] = mapped_column()
    assignee_name: Mapped[str | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())

    board: Mapped["Board"] = relationship(back_populates="tasks")
