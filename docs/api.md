# API

Локальный prefix — пустой, HTTPS gateway — `/api`. Актуальные схемы запросов и ответов доступны в `/docs` и `/openapi.json`.

## Авторизация и ошибки

Все приватные запросы используют cookie `ethereal_session`. Токен не возвращается в JSON и Bearer больше не принимается. Frontend отправляет `credentials: include`. POST/PATCH/DELETE требуют `X-CSRF-Token`, полученный после входа или через `/auth/csrf`. Если Origin присутствует, он должен быть в CORS_ORIGINS; это проверяется также для register/login. Шифрованный конверт пароля остаётся прежним: login, key_id, encrypted_key, nonce, encrypted_password.

| Метод и путь | Назначение |
| --- | --- |
| GET /auth/public-key | Ключ для конверта пароля |
| GET /auth/privacy | consent_version, operator, contact, demo |
| POST /auth/register | Конверт + consent=true, consent_version; remember=false по умолчанию |
| POST /auth/login | Конверт + remember=false по умолчанию |
| GET /auth/me | Текущий пользователь |
| GET /auth/csrf | CSRF-токен текущей сессии |
| POST /auth/logout | Отзыв сессии, очищение cookie, 204 |

Успешные register/login возвращают `{user, csrf_token}` и Set-Cookie. Без запоминания cookie сессионная, серверный TTL 24 часа; с запоминанием Max-Age и TTL 30 дней. HttpOnly и SameSite=Lax включены всегда, Secure — в HTTPS-конфигурации.

При действующей cookie-сессии register/login возвращают 409 с кодом `already_authenticated`, не создавая пользователя или новую сессию и не заменяя cookie. Для смены аккаунта сначала выполните logout. Истёкшая или отозванная сессия повторному входу не мешает. Авторизованного посетителя страницы `/login` frontend перенаправляет на `/dashboard` после проверки сессии.

Ошибка: `{ "detail": "Текст", "code": "revision_conflict" }`. Основные коды: unauthorized, invalid_credentials, already_authenticated, forbidden, csrf, consent_required, consent_outdated, validation_error, revision_conflict. Каталог остальных кодов: `app/errors.py`. 404 скрывает недоступную сущность; 403 означает отказ в операции; 409 — конфликт ревизии или повторная авторизация; 422 — неверные поля. Неизвестный клиенту код использует detail.

## Пространства и структура

| Метод и путь | Назначение |
| --- | --- |
| GET/POST /workspaces | Доступные пространства / создание |
| PATCH/DELETE /workspaces/{id} | Переименование / удаление |
| GET/POST /workspaces/{id}/members | Список / приглашение по login |
| PATCH/DELETE /workspaces/{id}/members/{user_id} | Роль / удаление участника |
| GET /workspaces/{id}/activity | Доступный журнал |
| GET /workspaces/{id}/sync | Идентификаторы и ревизии boards/documents/folders, members/workspaces, activity_revision/notification_revision |
| GET/POST /boards | Доски с задачами / новая доска |
| GET/PATCH/DELETE /boards/{id} | Одна доска / изменение / удаление |
| POST /boards/{id}/columns | Создание колонки |
| PATCH/DELETE /boards/{id}/columns/{uuid} | Изменение / удаление колонки |
| GET/POST /folders | Дерево папок / создание |
| GET/PATCH/DELETE /folders/{uuid} | Папка / изменение / удаление |
| GET /search?workspace_id=&q= | Поиск доступных задач и документов |

GET boards требует workspace_id. Параметры all_tasks=true или assignee_id доступны руководителям; участник ограничен собственными задачами. При удалении непустой колонки передаётся target_column_id той же доски; удаление задач последней колонки требует delete_tasks=true. Для непустой папки требуется явный recursive=true; удаление ограничено пространством и типом дерева.

## Задачи и документы

| Метод и путь | Назначение |
| --- | --- |
| GET/POST /tasks | Задачи board_id / создание |
| GET/PATCH/DELETE /tasks/{uuid} | Чтение / правка / удаление |
| POST /tasks/{uuid}/move | Только column_id и expected_revision; руководитель или текущий исполнитель |
| GET/POST /documents | Документы workspace_id / создание |
| GET/PATCH/DELETE /documents/{uuid} | Чтение / правка / удаление |
| POST /documents/{uuid}/versions | title, content, expected_revision; сохранение снимка |
| POST /documents/{uuid}/restore/{version_id} | expected_revision; восстановление после подтверждения |
| GET /documents/{uuid}/export?format=pdf\|docx | Выгрузка текущей сохранённой редакции |

PATCH задачи/документа, move, versions и restore требуют expected_revision>=1 из последнего ответа чтения. Ответ изменённой сущности содержит актуальную revision. Сохранение с устаревшей ревизией возвращает 409 и не меняет данные. Move в текущую колонку не создаёт повторный журнал или уведомление.

Restore создаёт новую версию с содержимым выбранной старой и `restored_from_id`, указывающим на её id. Автор новой версии — пользователь, выполнивший откат. Остальные версии не удаляются; ссылка на восстановленную версию тоже сохраняется при повторном откате. У обычных и существующих версий restored_from_id=null.

Экспорт доступен всем читателям. PDF: application/pdf; DOCX: application/vnd.openxmlformats-officedocument.wordprocessingml.document. Ответ содержит Content-Disposition с UTF-8 именем и Cache-Control: no-store. Слишком большой текст — 413, ошибка генератора или превышение 30 секунд — 503, неподдерживаемый format — 422. Поддерживаются заголовки, абзацы, списки, цитаты, выделение, ссылки и код; внешние изображения, стили и загрузка ресурсов исключены. [WeasyPrint](https://doc.courtbouillon.org/weasyprint/stable/first_steps.html), [python-docx](https://python-docx.readthedocs.io/en/latest/user/quickstart.html).

## Личные уведомления

| Метод и путь | Назначение |
| --- | --- |
| GET /notifications?before=&limit=30 | items, unread_count, next_cursor; limit 1..100 |
| POST /notifications/{id}/read | Прочитать своё уведомление, 204 |
| POST /notifications/read-all | Прочитать все свои уведомления, 204 |

Элемент: id, kind, title, workspace_id, entity_id, board_id, accessible, created_at, read_at. При утрате доступа title заменяется общим сообщением, связанные идентификаторы скрываются и переход запрещён. Нельзя читать или изменять прочитанность другого получателя.
