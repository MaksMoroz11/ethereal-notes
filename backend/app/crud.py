from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Board, Document, DocumentVersion, Session, Task, User
from app.schemas import BoardUpdate, DocumentUpdate, TaskCreate, TaskUpdate, UserCreate
from app.security import SESSION_TTL_HOURS, generate_token, hash_password


async def create_user(db: AsyncSession, data: UserCreate) -> User:
    user = User(login=data.login, password=hash_password(data.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_users(db: AsyncSession) -> list[User]:
    result = await db.execute(select(User).order_by(User.created_at))
    return list(result.scalars().all())


async def get_user(db: AsyncSession, user_id: int) -> User | None:
    return await db.get(User, user_id)


async def get_user_by_login(db: AsyncSession, login: str) -> User | None:
    result = await db.execute(select(User).where(User.login == login))
    return result.scalar_one_or_none()


async def create_session(db: AsyncSession, user: User) -> Session:
    session = Session(
        token=generate_token(),
        user_id=user.id,
        expires_at=datetime.utcnow() + timedelta(hours=SESSION_TTL_HOURS),
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def get_session_by_token(db: AsyncSession, token: str) -> Session | None:
    result = await db.execute(
        select(Session).options(selectinload(Session.user)).where(Session.token == token)
    )
    return result.scalar_one_or_none()


async def delete_session(db: AsyncSession, session: Session) -> None:
    await db.delete(session)
    await db.commit()


async def create_board(db: AsyncSession, title: str, owner_id: int) -> Board:
    board = Board(title=title, owner_id=owner_id)
    db.add(board)
    await db.commit()
    await db.refresh(board, attribute_names=["tasks"])
    return board


async def get_boards(db: AsyncSession, owner_id: int) -> list[Board]:
    result = await db.execute(
        select(Board)
        .options(selectinload(Board.tasks))
        .where(Board.owner_id == owner_id)
        .order_by(Board.created_at)
    )
    return list(result.scalars().all())


async def get_board(db: AsyncSession, board_id: int) -> Board | None:
    result = await db.execute(
        select(Board).options(selectinload(Board.tasks)).where(Board.id == board_id)
    )
    return result.scalar_one_or_none()


async def update_board(db: AsyncSession, board: Board, data: BoardUpdate) -> Board:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(board, field, value)
    await db.commit()
    await db.refresh(board)
    return board


async def delete_board(db: AsyncSession, board: Board) -> None:
    await db.delete(board)
    await db.commit()


async def create_task(db: AsyncSession, data: TaskCreate, author_id: int) -> Task:
    task = Task(**data.model_dump(), uid="", author_id=author_id)
    db.add(task)
    await db.flush()
    task.uid = str(1000 + task.id)
    await db.commit()
    await db.refresh(task)
    return task


async def get_tasks(db: AsyncSession, board_id: int | None = None) -> list[Task]:
    query = select(Task).order_by(Task.created_at.desc())
    if board_id is not None:
        query = query.where(Task.board_id == board_id)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_task(db: AsyncSession, task_id: int) -> Task | None:
    return await db.get(Task, task_id)


async def update_task(db: AsyncSession, task: Task, data: TaskUpdate) -> Task:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    await db.commit()
    await db.refresh(task)
    return task


async def delete_task(db: AsyncSession, task: Task) -> None:
    await db.delete(task)
    await db.commit()


_document_load = (
    selectinload(Document.owner),
    selectinload(Document.versions).selectinload(DocumentVersion.author),
)


async def create_document(db: AsyncSession, title: str, owner_id: int) -> Document:
    document = Document(title=title, content="", owner_id=owner_id)
    db.add(document)
    await db.commit()
    return await get_document(db, document.id)


async def get_documents(db: AsyncSession, owner_id: int) -> list[Document]:
    result = await db.execute(
        select(Document)
        .options(*_document_load)
        .where(Document.owner_id == owner_id)
        .order_by(Document.updated_at.desc())
    )
    return list(result.scalars().all())


async def get_document(db: AsyncSession, document_id: int) -> Document | None:
    result = await db.execute(
        select(Document).options(*_document_load).where(Document.id == document_id)
    )
    return result.scalar_one_or_none()


async def update_document(db: AsyncSession, document: Document, data: DocumentUpdate) -> Document:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(document, field, value)
    document.updated_at = datetime.utcnow()
    await db.commit()
    return await get_document(db, document.id)


async def delete_document(db: AsyncSession, document: Document) -> None:
    await db.delete(document)
    await db.commit()


async def save_document_version(
    db: AsyncSession,
    document: Document,
    title: str,
    content: str,
    author_id: int,
) -> Document:
    now = datetime.utcnow()
    document.title = title
    document.content = content
    document.updated_at = now
    db.add(
        DocumentVersion(
            document_id=document.id,
            title=title,
            content=content,
            author_id=author_id,
            created_at=now,
        )
    )
    await db.commit()
    return await get_document(db, document.id)


async def restore_document_version(
    db: AsyncSession,
    document: Document,
    version_id: int,
) -> Document | None:
    version = next((item for item in document.versions if item.id == version_id), None)
    if version is None:
        return None
    newer = [
        item
        for item in document.versions
        if item.created_at > version.created_at
        or (item.created_at == version.created_at and item.id > version.id)
    ]
    for item in newer:
        await db.delete(item)
    document.title = version.title
    document.content = version.content
    document.updated_at = datetime.utcnow()
    await db.commit()
    return await get_document(db, document.id)
