# Backend REST Postman Flow

Эта папка содержит воспроизводимые интеграционные тесты для backend REST API.

Что покрывается:

- `health`
- регистрация и логин пользователей
- `me`
- direct chat по email
- group chat по email
- участники чата
- отправка и чтение сообщений
- rename group chat
- delete group chat
- проверка, что удаление не ломает дальнейшие запросы API

## Файлы

- `backend-rest-flow.postman_collection.json`
- `backend-local.postman_environment.json`
- `generate-postman-assets.mjs`

## Генерация артефактов

```bash
node apps/backend/testing/generate-postman-assets.mjs
```

## Полный reset состояния

```bash
docker compose down -v --remove-orphans
docker volume rm tegeran_postgres_data
```

`tegeran_postgres_data` удаляется отдельно, потому что это legacy volume проекта. Текущий compose уже не монтирует его, но для чистого прогона его лучше удалить тоже.

## Подъём сервисов

```bash
docker compose up -d --build
```

Проверка готовности:

```bash
curl http://localhost:3000/api/v1/health
```

## Запуск через Postman CLI

```bash
postman collection run \
  apps/backend/testing/backend-rest-flow.postman_collection.json \
  -e apps/backend/testing/backend-local.postman_environment.json \
  -r cli,json \
  --reporter-json-export /tmp/backend-postman-report.json
```

## Что важно про шаг с сообщениями

GraphQL-BFF сценарий использовал пагинацию сообщений.

Текущий backend REST API серверную пагинацию для `GET /api/v1/chats/:chatId/messages` не поддерживает и возвращает полную упорядоченную историю чата. Поэтому в этой backend-коллекции шаг чтения сообщений адаптирован под фактический REST контракт:

- проверяется успешное чтение истории
- проверяется порядок сообщений
- проверяется целостность данных после нескольких отправок

## Краткий ручной сценарий

1. `GET /health`
2. зарегистрировать пользователей A/B/C
3. залогинить A/B/C
4. `GET /me` для A
5. `GET /chats`
6. `POST /chats/direct`
7. повторить `POST /chats/direct` и проверить тот же `id`
8. `POST /chats/group`
9. `GET /chats/:chatId/members`
10. зарегистрировать и залогинить D
11. `POST /chats/:chatId/members`
12. `DELETE /chats/:chatId/members/by-email`
13. `POST /chats/:chatId/messages` для direct
14. `POST /chats/:chatId/messages` для group
15. `GET /chats/:chatId/messages`
16. `PATCH /chats/:chatId`
17. `DELETE /chats/:chatId`
18. `GET /chats/:chatId` и получить `404`

## Для защиты

Коллекция:

- последовательная
- использует collection variables
- сохраняет токены и идентификаторы
- проверяет status codes и ключевые поля ответа
- запускается из CLI без ручных правок между шагами
