from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import ForeignKey, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID as PGUUID
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    login: Mapped[str] = mapped_column(unique=True)
    password: Mapped[str] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(default=func.now())


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    token: Mapped[str] = mapped_column(unique=True, index=True)
    csrf_token: Mapped[str] = mapped_column(default="")
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    expires_at: Mapped[datetime] = mapped_column()

    user: Mapped["User"] = relationship()


class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column()
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    owner: Mapped["User"] = relationship()
    members: Mapped[list["WorkspaceMember"]] = relationship(
        back_populates="workspace",
        cascade="all, delete-orphan",
    )


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"
    __table_args__ = (UniqueConstraint("workspace_id", "user_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    role: Mapped[str] = mapped_column(default="member")
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    workspace: Mapped["Workspace"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship()


class Board(Base):
    __tablename__ = "boards"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column()
    revision: Mapped[int] = mapped_column(default=1)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id"))
    folder_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("folders.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    tasks: Mapped[list["Task"]] = relationship(back_populates="board", cascade="all, delete-orphan")
    columns: Mapped[list["BoardColumn"]] = relationship(back_populates="board", cascade="all, delete-orphan", order_by="BoardColumn.position")


class Folder(Base):
    __tablename__ = "folders"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id"))
    kind: Mapped[str] = mapped_column(default="board")
    parent_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("folders.id"), nullable=True)
    title: Mapped[str] = mapped_column()
    revision: Mapped[int] = mapped_column(default=1)
    __mapper_args__ = {"version_id_col": revision}
    created_at: Mapped[datetime] = mapped_column(default=func.now())


class BoardColumn(Base):
    __tablename__ = "board_columns"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    board_id: Mapped[int] = mapped_column(ForeignKey("boards.id"))
    title: Mapped[str] = mapped_column()
    position: Mapped[int] = mapped_column()
    board: Mapped["Board"] = relationship(back_populates="columns")


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    board_id: Mapped[int] = mapped_column(ForeignKey("boards.id"))
    column_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("board_columns.id"))
    uid: Mapped[str] = mapped_column()
    title: Mapped[str] = mapped_column()
    revision: Mapped[int] = mapped_column(default=1)
    __mapper_args__ = {"version_id_col": revision}
    description: Mapped[str] = mapped_column(default="")
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    assignee_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())

    board: Mapped["Board"] = relationship(back_populates="tasks")
    author: Mapped["User"] = relationship(foreign_keys=[author_id])
    assignee: Mapped["User | None"] = relationship(foreign_keys=[assignee_id])


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    title: Mapped[str] = mapped_column()
    revision: Mapped[int] = mapped_column(default=1)
    __mapper_args__ = {"version_id_col": revision}
    content: Mapped[str] = mapped_column(Text, default="")
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id"))
    folder_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("folders.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())

    owner: Mapped["User"] = relationship()
    versions: Mapped[list["DocumentVersion"]] = relationship(
        back_populates="document",
        cascade="all, delete-orphan",
        order_by=lambda: (DocumentVersion.created_at.desc(), DocumentVersion.id.desc()),
    )

    @property
    def author_login(self) -> str:
        return self.owner.login if self.owner is not None else ""

    @property
    def updated_by(self) -> str:
        if self.versions:
            author = self.versions[0].author
            if author is not None:
                return author.login
        return self.owner.login if self.owner is not None else ""


class DocumentVersion(Base):
    __tablename__ = "document_versions"

    id: Mapped[int] = mapped_column(primary_key=True)
    document_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("documents.id"))
    title: Mapped[str] = mapped_column()
    content: Mapped[str] = mapped_column(Text, default="")
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    document: Mapped["Document"] = relationship(back_populates="versions")
    author: Mapped["User"] = relationship()

    @property
    def author_login(self) -> str:
        return self.author.login if self.author is not None else ""


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column()
    entity_type: Mapped[str] = mapped_column()
    entity_id: Mapped[str | None] = mapped_column(nullable=True)
    title: Mapped[str] = mapped_column(default="")
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    user: Mapped["User"] = relationship()

    @property
    def user_login(self) -> str:
        return self.user.login if self.user is not None else ""


class Consent(Base):
    __tablename__ = "consents"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    version: Mapped[str] = mapped_column()
    accepted_at: Mapped[datetime] = mapped_column(default=func.now())


class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(primary_key=True)
    recipient_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    workspace_id: Mapped[int | None] = mapped_column(ForeignKey("workspaces.id", ondelete="SET NULL"), nullable=True)
    kind: Mapped[str] = mapped_column()
    entity_id: Mapped[str | None] = mapped_column(nullable=True)
    title: Mapped[str] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    read_at: Mapped[datetime | None] = mapped_column(nullable=True)
