# Этап 1 — Инфраструктура и база данных

## Цель

Развернуть инфраструктуру проекта через Docker Compose и подготовить базу данных для backend-сервиса.

На данном этапе нужно сделать только:
- инфраструктуру (docker-compose)
- PostgreSQL
- базовую инициализацию Prisma (без бизнес-логики)

## Контекст проекта

Проект: текстовый мессенджер с пользователями, личными и групповыми чатами.

Текущий этап: Этап 1.  
Реализация должна строго ограничиваться этим этапом.

## Стек

- Docker Compose
- PostgreSQL
- Node.js
- Prisma ORM

## Глобальные ограничения

Запрещено:

- писать бизнес-логику
- реализовывать REST API
- добавлять GraphQL
- добавлять Keycloak
- реализовывать аутентификацию и авторизацию
- писать сервисы, контроллеры, DTO
- создавать лишние абстракции
- писать код для следующих этапов

Требования:

- минимальная и понятная структура
- единообразный нейминг
- конфигурация через .env (где применимо)
- Prisma используется только для схемы и миграции

## Scope этапа

Нужно реализовать:

1. docker-compose конфигурацию
2. PostgreSQL контейнер
3. создание двух баз данных:
   - messenger_db
   - keycloak_db
4. инициализацию проекта с Prisma
5. описание schema.prisma
6. выполнение начальной миграции
7. генерацию Prisma Client
8. успешный запуск инфраструктуры

## База данных

Используется PostgreSQL.

Необходимо:

- создать базу данных `messenger_db` — для доменных данных
- создать базу данных `keycloak_db` — для Keycloak (без использования на этом этапе)

Prisma работает только с `messenger_db`.

## Доменные сущности (Prisma schema)

Нужно описать модели:

### User
- id
- authSubject (unique)
- name
- email

### Chat
- id
- name (nullable)
- type (enum: DIRECT, GROUP)

### ChatMember
- id
- chatId
- userId
- role (enum: OWNER, MEMBER)

### Message
- id
- content
- senderId
- chatId
- createdAt

## Ограничения

- User.authSubject — уникальный
- связи:
  - ChatMember → Chat
  - ChatMember → User
  - Message → Chat
  - Message → User
- обязательные поля:
  - senderId
  - chatId

## Enum

### ChatType
- DIRECT
- GROUP

### ChatMemberRole
- OWNER
- MEMBER

## Требования к Prisma

Необходимо:

- создать schema.prisma
- описать модели и связи
- выполнить prisma migrate
- сгенерировать Prisma Client

## Требования к Docker Compose

Нужно описать:

### PostgreSQL
- отдельный сервис
- volume для данных
- переменные окружения (user, password)

Важно:

- должны создаваться две базы:
  - messenger_db
  - keycloak_db
- Для каждой базы свой пользователь
- Prisma подключается только к messenger_db

## Требования к запуску

Система должна запускаться командой:

- docker-compose up

После запуска:

- PostgreSQL доступен
- базы messenger_db и keycloak_db созданы
- Prisma миграция применена
- таблицы существуют

## Ожидаемый результат

После выполнения этапа в репозитории должно быть:

1. docker-compose.yml
2. конфигурация PostgreSQL
3. schema.prisma
4. миграции Prisma
5. сгенерированный Prisma Client

## Требования к результату от Codex

Codex должен выдать:

1. список созданных и изменённых файлов
2. краткое описание изменений
3. docker-compose.yml
4. schema.prisma
5. команды для запуска проекта
6. команды для выполнения миграций
7. явное указание, что backend, GraphQL и Keycloak НЕ реализованы
