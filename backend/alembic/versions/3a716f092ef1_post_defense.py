"""Consents, cookie sessions, revisions and notifications."""
from alembic import op
import sqlalchemy as sa

revision = "3a716f092ef1"
down_revision = "c92f01a7de34"
branch_labels = None
depends_on = None


def upgrade():
    for table in ("boards", "tasks", "documents", "folders"):
        op.add_column(table, sa.Column("revision", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("sessions", sa.Column("csrf_token", sa.String(), nullable=False, server_default=""))
    op.execute("DELETE FROM sessions")
    op.create_table("consents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version", sa.String(), nullable=False),
        sa.Column("accepted_at", sa.DateTime(), nullable=False))
    op.create_index("ix_consents_user_id", "consents", ["user_id"])
    op.create_table("notifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("recipient_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("workspace_id", sa.Integer(), sa.ForeignKey("workspaces.id", ondelete="SET NULL")),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("entity_id", sa.String()), sa.Column("title", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False), sa.Column("read_at", sa.DateTime()))
    op.create_index("ix_notifications_recipient_id", "notifications", ["recipient_id"])


def downgrade():
    op.drop_table("notifications")
    op.drop_table("consents")
    op.drop_column("sessions", "csrf_token")
    for table in ("boards", "tasks", "documents", "folders"):
        op.drop_column(table, "revision")
