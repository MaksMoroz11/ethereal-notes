# Разработка и Git

`main` содержит релизы, `dev` — интеграцию. Отдельная доработка выполняется в `codex/<изменение>` и оформляется PR в `dev`. Проверенный релиз из `dev` отправляется отдельным PR в `main`.

```bash
git.exe fetch origin
git.exe switch dev
git.exe pull --ff-only origin dev
git.exe switch -c codex/change-name
```

Перед коммитом просмотреть diff, выполнить относящиеся к изменению проверки и повторить оформление собственных коммитов автора проекта. В существующей истории используются краткие английские сообщения `dev: ...`, `fix: ...`, `feat: ...`. Использовать текущую Git-конфигурацию, не переопределять автора и не переписывать опубликованную историю.

```bash
git.exe diff --check
git.exe diff
pnpm --dir frontend lint
pnpm --dir frontend test
pnpm --dir frontend build
# из backend, DATABASE_URL разрешает создание временной БД
python tests/run_isolated.py
# из корня
docker compose build backend frontend
git.exe add <files>
git.exe commit -m "dev: describe the completed change"
git.exe push -u origin codex/change-name
```

Шаблон PR находится в `.github/pull_request_template.md`: проблема, поведение, проверка и совместимость. В PR явно указывать миграции, изменения конфигурации и ограничения проверки. Не коммитить `.env`, приватный ключ, дампы рабочей базы и локальные артефакты проверок.

GitHub Actions запускаются на main/dev/codex/** и PR в main/dev: frontend lint/test/build; backend-тесты на отдельной PostgreSQL, миграции и Docker-сборки. Зависимости frontend фиксирует pnpm-lock.yaml, backend — requirements.txt/requirements.lock.

После успешной проверки PR интегрируется в `dev`; затем проверяется релизный PR в `main`. Настройку required checks и защиты веток выполняет владелец репозитория в GitHub Settings. Сама workflow не включает эту настройку автоматически.

Обновление production — отдельное действие. До миграции сохранять резервную копию БД, ключи и окружение. Новая авторизация требует повторного входа. Git reset, force push и смена server .env не являются частью обычного релиза.
