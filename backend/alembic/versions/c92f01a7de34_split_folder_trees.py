"""Separate board and document folder trees."""

from uuid import uuid4

from alembic import op
import sqlalchemy as sa

revision = "c92f01a7de34"
down_revision = "b8c6e4a19d20"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "folders",
        sa.Column("kind", sa.String(), nullable=False, server_default="board"),
    )

    connection = op.get_bind()
    folders = sa.table(
        "folders",
        sa.column("id", sa.Uuid()),
        sa.column("workspace_id", sa.Integer()),
        sa.column("parent_id", sa.Uuid()),
        sa.column("title", sa.String()),
        sa.column("created_at", sa.DateTime()),
        sa.column("kind", sa.String()),
    )
    documents = sa.table(
        "documents",
        sa.column("id", sa.Uuid()),
        sa.column("folder_id", sa.Uuid()),
    )

    old_folders = connection.execute(
        sa.select(
            folders.c.id,
            folders.c.workspace_id,
            folders.c.parent_id,
            folders.c.title,
            folders.c.created_at,
        ).order_by(folders.c.created_at, folders.c.id)
    ).mappings().all()

    document_folder_ids: dict[object, object] = {}
    pending = list(old_folders)
    while pending:
        remaining = []
        made_progress = False
        for folder in pending:
            parent_id = folder["parent_id"]
            if parent_id is not None and parent_id not in document_folder_ids:
                remaining.append(folder)
                continue
            new_id = uuid4()
            document_folder_ids[folder["id"]] = new_id
            connection.execute(
                folders.insert().values(
                    id=new_id,
                    workspace_id=folder["workspace_id"],
                    parent_id=document_folder_ids.get(parent_id),
                    title=folder["title"],
                    created_at=folder["created_at"],
                    kind="document",
                )
            )
            made_progress = True
        if not made_progress:
            raise RuntimeError("Cannot copy folder tree: parent folders are missing or cyclic")
        pending = remaining

    for old_id, new_id in document_folder_ids.items():
        connection.execute(
            documents.update().where(documents.c.folder_id == old_id).values(folder_id=new_id)
        )

    op.alter_column("folders", "kind", server_default=None)


def downgrade() -> None:
    raise RuntimeError("Splitting folder trees cannot be reversed without merging user changes")
