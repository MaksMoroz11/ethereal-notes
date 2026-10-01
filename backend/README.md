# Backend

Бэкенд для Ethereal на FastAPI и PostgreSQL. Авторизация, рабочие пространства, роли, доски, задачи, документы с версиями и журнал действий.

## Что умеет

Регистрация и вход работают по токену сессии. После регистрации пользователю создаётся личное рабочее пространство. Доски, задачи и документы принадлежат пространству, а доступ определяется членством.

В пространстве есть роли `owner`, `admin` и `member`. Владелец и администратор управляют структурой и содержимым. Участник читает документы и только назначенные ему задачи. Задачи он не меняет. Основные операции фиксируются в журнале действий.

## Стек

- FastAPI - сам веб-сервер и роуты
- PostgreSQL - база данных
- SQLAlchemy (async) - работа с базой через asyncpg
- Alembic - миграции
- Pydantic - проверка данных на входе и выходе

## Схема БД

Актуальная схема описана моделями в `app/models.py` и миграциями в `alembic/versions`.

## Структура

- app/main.py - точка входа, при старте проверяется актуальность миграций
- app/config.py - читает настройки из .env
- app/database.py - подключение к базе и сессия
- app/models.py - модели пользователей, пространств, папок, досок, колонок, задач, документов и журнала
- app/schemas.py - схемы данных для запросов и ответов
- app/crud.py - функции работы с базой
- app/security.py - хеш пароля, шифрование запросов входа и сессии
- app/routers/auth.py - адреса /auth
- app/routers/users.py - адреса /users
- app/routers/workspaces.py - адреса /workspaces, участники и журнал
- app/routers/boards.py - адреса /boards
- app/routers/tasks.py - адреса /tasks
- app/routers/documents.py - адреса /documents

## Поля пользователя

- login - логин
- password - хеш пароля
- created_at - когда зарегистрировался

## Поля доски

- title - название доски
- owner_id - кто создал
- workspace_id - рабочее пространство
- created_at - когда создали
- tasks - задачи этой доски

## Поля рабочего пространства

- name - название
- owner_id - владелец
- created_at - когда создали
- members - участники с ролями `owner`, `admin` или `member`

## Поля участника пространства

- workspace_id - рабочее пространство
- user_id - пользователь
- role - роль участника
- created_at - когда добавили

## Поля задачи

- board_id - к какой доске относится
- uid - номер задачи который видно
- title - что за задача
- description - подробное описание
- column_id - колонка доски
- tags - метки типа DEV, BUG
- author_id - кто создал
- assignee_id - кому назначено, может быть пусто
- created_at - когда создали
- updated_at - когда обновили

## Поля документа

- title - название
- content - текущий текст
- owner_id - кто создал
- workspace_id - рабочее пространство
- created_at / updated_at - даты
- versions - снимки: title, content, author_id, created_at

## Поля записи журнала

- workspace_id - рабочее пространство
- user_id - кто выполнил действие
- action - тип действия
- entity_type / entity_id - затронутая сущность
- title - название сущности на момент действия
- created_at - когда выполнили

## Адреса

- POST /auth/register - регистрация
- POST /auth/login - вход
- GET /auth/public-key - ключ для шифрования пароля в браузере
- POST /auth/logout - выход
- GET /auth/me - текущий пользователь
- GET /users - список пользователей
- GET /users/{id} - один пользователь
- GET /workspaces - доступные пространства текущего пользователя
- POST /workspaces - создать пространство
- PATCH /workspaces/{id} - переименовать пространство
- DELETE /workspaces/{id} - удалить пространство вместе с содержимым
- GET /workspaces/{id}/members - список участников
- POST /workspaces/{id}/members - пригласить пользователя по логину
- PATCH /workspaces/{id}/members/{user_id} - изменить роль участника
- DELETE /workspaces/{id}/members/{user_id} - удалить участника
- GET /workspaces/{id}/activity - журнал действий пространства
- POST /boards - создать доску
- GET /boards?workspace_id= - доски пространства с задачами
- GET /boards/{id} - одна доска с задачами
- PATCH /boards/{id} - обновить
- DELETE /boards/{id} - удалить доску вместе с её задачами
- POST/PATCH/DELETE /boards/{id}/columns - управление колонками
- GET/POST/PATCH/DELETE /folders - вложенные папки досок и документов
- DELETE /folders/{id}?recursive=true - подтверждённое удаление папки со всеми подпапками, досками и задачами либо документами и версиями. Без `recursive=true` непустая папка не удаляется.
- GET /search?workspace_id=&q= - поиск по задачам и документам
- POST /tasks - создать задачу
- GET /tasks?board_id= - задачи доски
- GET /tasks/{id} - одна задача
- PATCH /tasks/{id} - обновить
- DELETE /tasks/{id} - удалить
- POST /documents - создать документ
- GET /documents?workspace_id= - документы пространства
- GET /documents/{id} - один документ
- PATCH /documents/{id} - обновить
- DELETE /documents/{id} - удалить
- POST /documents/{id}/versions - сохранить снимок
- POST /documents/{id}/restore/{version_id} - откатить

## Как запустить

Локально:

1. Зайти в папку backend
2. Поставить зависимости: pip install -r requirements.txt
3. Скопировать .env.example в .env и вписать свои данные базы
4. Применить миграции: `alembic upgrade head`.
5. Запустить: `uvicorn app.main:app --reload`.

Через Docker из корня репозитория: `docker compose up --build`. Перед запуском API контейнер автоматически применяет миграции Alembic после готовности PostgreSQL.

Фронт будет на http://localhost, API на http://localhost:8000, документация на http://localhost:8000/docs

## Тесты

Для установки зависимостей разработки: `pip install -r requirements-dev.txt`

Запуск из папки `backend`: `python tests/run_isolated.py`. Настрой `DATABASE_URL` в `.env`: подключение должно позволять создавать тестовые базы. Скрипт создаёт отдельную временную БД, применяет миграции, запускает тесты и удаляет её; рабочие данные не изменяются.

Для заранее подготовленной отдельной тестовой базы можно задать `TEST_DATABASE_URL` и запустить `pytest -q`. Без этого параметра pytest откажется запускать тесты, чтобы не использовать рабочую БД.
