# Postman Flow

Артефакты в этой папке:

- `graphql-bff-flow.postman_collection.json` — последовательный flow GraphQL-BFF
- `graphql-bff-local.postman_environment.json` — локальное окружение
- `generate-postman-assets.mjs` — генератор JSON-артефактов

## Генерация артефактов

```bash
node apps/graphql-bff/testing/generate-postman-assets.mjs
```

## Запуск через Postman CLI

```bash
postman collection run \
  apps/graphql-bff/testing/graphql-bff-flow.postman_collection.json \
  -e apps/graphql-bff/testing/graphql-bff-local.postman_environment.json \
  -r cli,json \
  --reporter-json-export /tmp/graphql-bff-postman-report.json
```

## Reset и повторный прогон

```bash
docker compose down -v --remove-orphans
docker compose up -d --build
```

После старта сервисов можно запускать collection run.
