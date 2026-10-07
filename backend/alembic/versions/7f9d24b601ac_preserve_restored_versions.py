"""Link restored versions without deleting document history."""
from alembic import op
import sqlalchemy as sa

revision = "7f9d24b601ac"
down_revision = "3a716f092ef1"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("document_versions", sa.Column("restored_from_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_document_versions_restored_from", "document_versions", "document_versions",
                          ["restored_from_id"], ["id"], ondelete="SET NULL")


def downgrade():
    op.drop_constraint("fk_document_versions_restored_from", "document_versions", type_="foreignkey")
    op.drop_column("document_versions", "restored_from_id")
