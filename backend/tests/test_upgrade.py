"""Upgrade a populated previous schema without changing the working database."""
import asyncio
import os
import subprocess
import sys
from uuid import uuid4

import asyncpg
import pytest
from sqlalchemy.engine import make_url

from app.config import settings


@pytest.mark.parametrize("previous_revision", ["c92f01a7de34", "3a716f092ef1"])
def test_upgrade_preserves_existing_data_without_backdating_consent(previous_revision):
    name = "ethereal_upgrade_" + uuid4().hex
    admin_url = make_url(settings.database_url).set(drivername="postgresql")
    database = admin_url.set(database=name)
    env = dict(os.environ, DATABASE_URL=database.set(drivername="postgresql+asyncpg").render_as_string(hide_password=False))
    folder, column, task, document = (uuid4() for _ in range(4))

    async def sql(target, callback):
        connection = await asyncpg.connect(target.render_as_string(hide_password=False))
        try:
            return await callback(connection)
        finally:
            await connection.close()

    async def create(connection):
        await connection.execute(f'CREATE DATABASE "{name}"')

    async def populate(connection):
        await connection.execute("INSERT INTO users (id,login,password,created_at) VALUES (1,'legacy','existing-hash',now())")
        await connection.execute("INSERT INTO workspaces (id,name,owner_id,created_at) VALUES (1,'Existing',1,now())")
        await connection.execute("INSERT INTO workspace_members (id,workspace_id,user_id,role,created_at) VALUES (1,1,1,'owner',now())")
        await connection.execute("INSERT INTO folders (id,workspace_id,kind,title,created_at) VALUES ($1,1,'board','Existing folder',now())", folder)
        await connection.execute("INSERT INTO boards (id,title,owner_id,workspace_id,folder_id,created_at) VALUES (1,'Existing board',1,1,$1,now())", folder)
        await connection.execute("INSERT INTO board_columns (id,board_id,title,position) VALUES ($1,1,'Existing column',0)", column)
        await connection.execute("INSERT INTO tasks (id,board_id,column_id,uid,title,description,tags,author_id,created_at,updated_at) VALUES ($1,1,$2,'1001','Existing task','Old description','{}',1,now(),now())", task, column)
        await connection.execute("INSERT INTO documents (id,title,content,owner_id,workspace_id,created_at,updated_at) VALUES ($1,'Existing document','<p>Сохранённый текст</p>',1,1,now(),now())", document)
        await connection.execute("INSERT INTO document_versions (id,document_id,title,content,author_id,created_at) VALUES (1,$1,'Old version','Old text',1,now())", document)
        await connection.execute("INSERT INTO sessions (id,token,user_id,created_at,expires_at) VALUES (1,'old-token',1,now(),now()+interval '1 day')")
        if previous_revision == "3a716f092ef1":
            await connection.execute("INSERT INTO consents (id,user_id,version,accepted_at) VALUES (1,1,'existing-consent',now()-interval '1 day')")

    async def verify(connection):
        assert await connection.fetchval("SELECT password FROM users WHERE id=1") == "existing-hash"
        assert await connection.fetchval("SELECT content FROM documents WHERE id=$1", document) == "<p>Сохранённый текст</p>"
        assert await connection.fetchval("SELECT content FROM document_versions WHERE id=1") == "Old text"
        assert await connection.fetchval("SELECT restored_from_id FROM document_versions WHERE id=1") is None
        for table in ("boards", "tasks", "documents", "folders"):
            assert await connection.fetchval(f"SELECT revision FROM {table}") == 1
        expected_count = 1 if previous_revision == "3a716f092ef1" else 0
        assert await connection.fetchval("SELECT count(*) FROM consents") == expected_count
        assert await connection.fetchval("SELECT count(*) FROM sessions") == expected_count

    async def remove(connection):
        await connection.execute("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1", name)
        await connection.execute(f'DROP DATABASE "{name}"')

    asyncio.run(sql(admin_url, create))
    try:
        subprocess.run([sys.executable, "-m", "alembic", "upgrade", previous_revision], env=env, check=True, capture_output=True)
        asyncio.run(sql(database, populate))
        subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], env=env, check=True, capture_output=True)
        asyncio.run(sql(database, verify))
    finally:
        asyncio.run(sql(admin_url, remove))
