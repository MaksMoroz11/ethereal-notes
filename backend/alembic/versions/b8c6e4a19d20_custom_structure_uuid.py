"""Custom board columns, folders, and UUID task/document IDs."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "b8c6e4a19d20"
down_revision = "f2a4d0e95b23"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "folders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workspace_id", sa.Integer(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("folders.id")),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.add_column("boards", sa.Column("folder_id", postgresql.UUID(as_uuid=True)))
    op.add_column("documents", sa.Column("folder_id", postgresql.UUID(as_uuid=True)))
    op.create_foreign_key("boards_folder_id_fkey", "boards", "folders", ["folder_id"], ["id"])
    op.create_foreign_key("documents_folder_id_fkey", "documents", "folders", ["folder_id"], ["id"])

    op.create_table(
        "board_columns",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("board_id", sa.Integer(), sa.ForeignKey("boards.id"), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
    )
    op.execute("""
        INSERT INTO board_columns (id, board_id, title, position)
        SELECT gen_random_uuid(), b.id, defaults.title, defaults.position
        FROM boards b CROSS JOIN (VALUES
            ('Открыта', 0), ('В работе', 1), ('На проверке', 2), ('Готово', 3)
        ) AS defaults(title, position)
    """)
    op.execute("""
        INSERT INTO board_columns (id, board_id, title, position)
        SELECT gen_random_uuid(), x.board_id, x.status,
               3 + row_number() OVER (PARTITION BY x.board_id ORDER BY x.status)
        FROM (SELECT DISTINCT board_id, status FROM tasks
              WHERE status NOT IN ('Открыта', 'В работе', 'На проверке', 'Готово')) x
    """)
    op.add_column("tasks", sa.Column("column_id", postgresql.UUID(as_uuid=True)))
    op.execute("""
        UPDATE tasks t SET column_id = c.id FROM board_columns c
        WHERE c.board_id = t.board_id AND c.title = t.status
    """)
    op.alter_column("tasks", "column_id", nullable=False)
    op.create_foreign_key("tasks_column_id_fkey", "tasks", "board_columns", ["column_id"], ["id"])
    op.drop_column("tasks", "status")

    op.execute("CREATE SEQUENCE task_uid_seq START WITH 1001")
    op.execute("SELECT setval('task_uid_seq', GREATEST(COALESCE((SELECT MAX(uid::bigint) FROM tasks), 1000), 1000), true)")

    op.add_column("tasks", sa.Column("uuid_id", postgresql.UUID(as_uuid=True)))
    op.add_column("documents", sa.Column("uuid_id", postgresql.UUID(as_uuid=True)))
    op.execute("UPDATE tasks SET uuid_id = gen_random_uuid()")
    op.execute("UPDATE documents SET uuid_id = gen_random_uuid()")
    op.add_column("document_versions", sa.Column("uuid_document_id", postgresql.UUID(as_uuid=True)))
    op.execute("""
        UPDATE document_versions v SET uuid_document_id = d.uuid_id
        FROM documents d WHERE v.document_id = d.id
    """)
    op.alter_column("document_versions", "uuid_document_id", nullable=False)
    op.alter_column("activity_logs", "entity_id", type_=sa.String(),
                    postgresql_using="entity_id::text")
    op.execute("""
        UPDATE activity_logs a SET entity_id = d.uuid_id::text FROM documents d
        WHERE a.entity_type = 'document' AND a.entity_id = d.id::text
    """)
    op.execute("""
        UPDATE activity_logs a SET entity_id = t.uuid_id::text FROM tasks t
        WHERE a.entity_type = 'task' AND a.entity_id = t.id::text
    """)

    op.drop_constraint("document_versions_document_id_fkey", "document_versions", type_="foreignkey")
    op.drop_column("document_versions", "document_id")
    op.alter_column("document_versions", "uuid_document_id", new_column_name="document_id")

    for table in ("tasks", "documents"):
        op.drop_constraint(f"{table}_pkey", table, type_="primary")
        op.drop_column(table, "id")
        op.alter_column(table, "uuid_id", new_column_name="id", nullable=False)
        op.create_primary_key(f"{table}_pkey", table, ["id"])
    op.create_foreign_key("document_versions_document_id_fkey", "document_versions", "documents", ["document_id"], ["id"])


def downgrade() -> None:
    raise RuntimeError("UUID migration cannot be reversed without a data export")
