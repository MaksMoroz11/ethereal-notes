"""add workspaces

Revision ID: e1f3c9d84a12
Revises: c4e8a1b092d3
Create Date: 2026-08-27 09:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e1f3c9d84a12"
down_revision: Union[str, Sequence[str], None] = "c4e8a1b092d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "workspaces",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "workspace_members",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("workspace_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("workspace_id", "user_id"),
    )
    op.add_column("boards", sa.Column("workspace_id", sa.Integer(), nullable=True))
    op.add_column("documents", sa.Column("workspace_id", sa.Integer(), nullable=True))

    connection = op.get_bind()
    users = connection.execute(sa.text("SELECT id, login FROM users")).fetchall()
    for user in users:
        ws_id = connection.execute(
            sa.text(
                "INSERT INTO workspaces (name, owner_id, created_at) "
                "VALUES (:name, :owner_id, NOW()) RETURNING id"
            ),
            {"name": f"Пространство {user.login}", "owner_id": user.id},
        ).scalar()
        connection.execute(
            sa.text(
                "INSERT INTO workspace_members (workspace_id, user_id, role, created_at) "
                "VALUES (:workspace_id, :user_id, 'owner', NOW())"
            ),
            {"workspace_id": ws_id, "user_id": user.id},
        )
        connection.execute(
            sa.text("UPDATE boards SET workspace_id = :workspace_id WHERE owner_id = :user_id"),
            {"workspace_id": ws_id, "user_id": user.id},
        )
        connection.execute(
            sa.text("UPDATE documents SET workspace_id = :workspace_id WHERE owner_id = :user_id"),
            {"workspace_id": ws_id, "user_id": user.id},
        )

    op.alter_column("boards", "workspace_id", existing_type=sa.Integer(), nullable=False)
    op.alter_column("documents", "workspace_id", existing_type=sa.Integer(), nullable=False)
    op.create_foreign_key("boards_workspace_id_fkey", "boards", "workspaces", ["workspace_id"], ["id"])
    op.create_foreign_key(
        "documents_workspace_id_fkey", "documents", "workspaces", ["workspace_id"], ["id"]
    )


def downgrade() -> None:
    op.drop_constraint("documents_workspace_id_fkey", "documents", type_="foreignkey")
    op.drop_constraint("boards_workspace_id_fkey", "boards", type_="foreignkey")
    op.drop_column("documents", "workspace_id")
    op.drop_column("boards", "workspace_id")
    op.drop_table("workspace_members")
    op.drop_table("workspaces")
