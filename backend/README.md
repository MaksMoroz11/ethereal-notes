# Backend

FastAPI, PostgreSQL, асинхронные SQLAlchemy/asyncpg и Alembic. API управляет пользователями, пространствами, досками, задачами, документами, журналом, согласиями и уведомлениями.

## Запуск

Рекомендуется Docker: образ содержит Pango и шрифты Noto для PDF.

```bash
docker compose up --build
```

При запуске контейнер применяет миграции. Для отдельного запуска нужен Python 3.12+, PostgreSQL и системные зависимости WeasyPrint (Pango); на Windows для PDF проще использовать Docker.

```bash
cd backend
python -m venv .venv
# активировать .venv, скопировать .env.example в .env
pip install -r requirements-dev.txt
alembic upgrade head
uvicorn app.main:app --reload
```

API: `http://127.0.0.1:8000`, OpenAPI: `/docs`. Без актуальных миграций запуск прекращается. Версии зависимостей зафиксированы в `requirements.txt` и `requirements.lock`; dev-зависимости — в `requirements-dev.txt`.

## Настройки

`DATABASE_URL`, `CORS_ORIGINS`, `API_ROOT_PATH`, `AUTH_PRIVATE_KEY_FILE` — существующие настройки. `COOKIE_SECURE=false` используется только при локальном HTTP; серверный compose задаёт true для HTTPS. `PRIVACY_OPERATOR`, `PRIVACY_CONTACT` по умолчанию пустые. `CONSENT_VERSION` обозначает редакцию согласия (по умолчанию 2026-10-07): менять вместе с текстом и документацией.

## Устройство

- `app/database.py`: одна транзакция на запрос, commit после выполнения, rollback при ошибке.
- `app/crud.py`: изменения и flush без промежуточных commit.
- `app/access.py`: проверка членства и ролей.
- `app/errors.py`: каталог сообщений и стабильных кодов.
- `app/routers/auth.py`: HttpOnly-cookie и CSRF.
- `app/routers/sync.py`: список доступных сущностей и ревизии без содержимого документов.
- `app/notifications.py`, `routers/notifications.py`: получатели, история и проверка текущего доступа.
- `app/exporting.py`, `export_worker.py`: единый ограниченный разбор HTML и генерация PDF/DOCX в отдельном процессе (до 30 секунд, до 1 МБ текста, два одновременных экспорта).

При изменении задачи увеличивается её ревизия и ревизия доски. Документы и папки используют version_id SQLAlchemy. `expected_revision` обязателен при правках задач/документов; конкурентное изменение возвращает 409. Действие, журнал, ревизии и уведомления фиксируются вместе.

## Миграции и существующие данные

Новая миграция `3a716f092ef1` продолжает `c92f01a7de34`, добавляет согласия, уведомления, CSRF и ревизии. Пользователи, задачи, тексты, папки и версии сохраняются. Старые сессии отзываются; пользователи входят повторно. Принятие согласия за существующих пользователей не создаётся. До обновления сервера делайте резервную копию БД; `alembic upgrade head` применяет обновление. Downgrade удаляет добавленные таблицы и поля, поэтому данные уведомлений и согласий будут потеряны.

## Проверки

```bash
python tests/run_isolated.py
```

`DATABASE_URL` должен разрешать создание временной базы. Runner создаёт отдельную БД, применяет миграции, выполняет тесты и удаляет её. Рабочая БД не изменяется. Для уже подготовленной отдельной базы задайте `TEST_DATABASE_URL` и запускайте `pytest -q`; без него pytest отказывается работать. PDF-тест исполняется на Linux с Pango, Windows проверяет DOCX и остальные API-сценарии.

[API](../docs/api.md), [схема БД](../docs/database.md), [матрица прав](../docs/architecture.md), [процесс разработки](../docs/development.md).
