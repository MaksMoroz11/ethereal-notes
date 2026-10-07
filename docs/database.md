# Схема базы данных

Актуальный источник — `backend/app/models.py` и Alembic. Изображение построено по текущим таблицам и внешним ключам моделей. Ниже приведена схема связей.

![Схема PostgreSQL](db-schema.png)

```mermaid
erDiagram
    users ||--o{ sessions : session
    users ||--o{ consents : consent
    users ||--o{ notifications : recipient
    users ||--o{ workspaces : owner
    workspaces ||--|{ workspace_members : members
    users ||--o{ workspace_members : membership
    workspaces ||--o{ folders : folders
    folders ||--o{ folders : parent
    workspaces ||--o{ boards : boards
    folders o|--o{ boards : location
    boards ||--o{ board_columns : columns
    boards ||--o{ tasks : tasks
    board_columns ||--o{ tasks : column
    users ||--o{ tasks : author_and_assignee
    workspaces ||--o{ documents : documents
    folders o|--o{ documents : location
    documents ||--o{ document_versions : versions
    users ||--o{ document_versions : author
    workspaces ||--o{ activity_logs : activity
    workspaces o|--o{ notifications : context
    sessions {
        int id PK
        int user_id FK
        string token UK
        string csrf_token
        datetime created_at
        datetime expires_at
    }
    consents {
        int id PK
        int user_id FK
        string version
        datetime accepted_at
    }
    notifications {
        int id PK
        int recipient_id FK
        int workspace_id FK
        string kind
        string entity_id
        string title
        datetime created_at
        datetime read_at
    }
    tasks {
        uuid id PK
        int board_id FK
        uuid column_id FK
        int revision
        int assignee_id FK
        int author_id FK
    }
    documents {
        uuid id PK
        int workspace_id FK
        uuid folder_id FK
        int revision
        string title
        text content
    }
    boards {
        int id PK
        int workspace_id FK
        uuid folder_id FK
        int revision
    }
    folders {
        uuid id PK
        int workspace_id FK
        uuid parent_id FK
        string kind
        int revision
    }
```

Идентификаторы задач, документов, папок и колонок — UUID; досок, пространств, пользователей, журнала и версий — integer. Дата хранится как UTC без часового пояса и переводится в локальное время интерфейсом. Членство уникально по паре workspace_id/user_id; логин и токен сессии уникальны.

Ревизия начинается с 1. Task/Document/Folder используют версионную проверку SQLAlchemy; Board увеличивается атомарно при изменениях задачи и колонок. Сведения о принятии согласия содержат конкретную редакцию, без заполнения задним числом. Read_at=null означает непрочитанное уведомление.

Индексы добавлены для получателя уведомления и пользователя согласия. Удаление пространства обнуляет workspace_id уведомления; история остаётся личной, объект становится недоступным. Удаление пользователя каскадно удаляет его уведомления и согласия. Остальные зависимости удаляются существующими CRUD-операциями в одной транзакции.

Миграция `3a716f092ef1` добавляет новые поля с ревизией 1, новые таблицы и отзывает прежние сессии. Тест `test_upgrade.py` создаёт заполненную предыдущую схему, выполняет upgrade и проверяет сохранение данных и отсутствие вымышленных согласий.
