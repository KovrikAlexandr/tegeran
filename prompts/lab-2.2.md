````md
<!-- prompts/lab-2.2.md -->

# Этап 2.2 — REST API (Controller слой)

## Важно

Данный этап продолжает Этап 2.1 и **использует уже реализованный backend core**:

- DAO (Prisma)
- Service слой
- тесты

В `prompts/global.md` этап 2 описан как единый этап, но в текущей реализации он разделён:

- Этап 2.1 — backend core
- Этап 2.2 — REST API

На этом этапе **нельзя изменять бизнес-логику**, реализованную в service слое.

---

## Цель

Реализовать REST API поверх существующего service слоя.

Нужно:
- спроектировать и реализовать controller слой
- связать HTTP endpoints с service слоем
- реализовать базовую аутентификационную прослойку (с feature flag)

---

## Контекст

Перед началом необходимо прочитать:

1. `prompts/global.md`
2. `prompts/lab-2.1.md`
3. `prompts/lab-2.2.md`

---

## Scope этапа

Нужно реализовать:

1. Controller слой (NestJS)
2. DTO для request/response
3. Mapping HTTP → service layer
4. Error handling
5. Feature flag для отключения авторизации
6. Простую auth abstraction (без Keycloak)

---

## Feature flag для авторизации

Нужно ввести конфигурационный флаг:

```env
AUTH_ENABLED=true | false
````

### Поведение

#### Если `AUTH_ENABLED=false`

* сервис работает **без авторизации**
* используется mock user
* все protected endpoints доступны
* текущий пользователь фиксированный (например `userId=1`)

#### Если `AUTH_ENABLED=true`

* требуется передача `Authorization: Bearer <token>`
* пока НЕ валидировать JWT
* просто извлекать `sub` (или использовать заглушку)
* формировать `CurrentUser`

Важно:

* код должен быть готов к будущей интеграции Keycloak
* не реализовывать реальную JWT валидацию

---

## Аутентификация (на этом этапе)

Нужно реализовать:

* guard или middleware
* извлечение текущего пользователя
* формирование `CurrentUser`

Нельзя:

* использовать Keycloak SDK
* реализовывать OAuth flow
* реализовывать refresh tokens

---

## Архитектура

Слой controller:

* не содержит бизнес-логики
* вызывает service методы
* делает mapping:

  * HTTP → service input
  * service output → response DTO

Service слой:

* не изменяется
* не знает про HTTP

---

## Реализуемые endpoints

## Health

### GET /api/v1/health

Public

---

## Current user

### GET /api/v1/me

---

## Chats

### GET /api/v1/chats

### GET /api/v1/chats/:chatId

### POST /api/v1/chats/direct

### POST /api/v1/chats/group

### DELETE /api/v1/chats/:chatId

### POST /api/v1/chats/:chatId/leave

---

## Chat members

### GET /api/v1/chats/:chatId/members

### POST /api/v1/chats/:chatId/members

### DELETE /api/v1/chats/:chatId/members/:userId

---

## Messages

### GET /api/v1/chats/:chatId/messages

### POST /api/v1/chats/:chatId/messages

---

## DTO

Нужно создать:

* Request DTO
* Response DTO

Требования:

* не использовать Prisma модели напрямую
* DTO должны быть явно определены
* валидировать входные данные (class-validator)

---

## Обработка ошибок

Нужно:

* маппить ошибки service слоя в HTTP ошибки
* использовать стандартные HTTP статусы:

  * 400
  * 401
  * 403
  * 404
  * 409

---

## Требования к качеству

* controllers тонкие
* логика только в service
* чистый нейминг
* единый стиль DTO
* единый стиль ошибок

---

## Ограничения

Запрещено:

* менять service слой
* добавлять бизнес-логику в controller
* подключать Keycloak
* валидировать JWT
* писать GraphQL
* писать frontend
* писать realtime

---

## Критерии готовности

Этап завершён, если:

* все endpoints реализованы
* сервис запускается
* endpoints работают
* feature flag работает
* можно вызвать API без авторизации (`AUTH_ENABLED=false`)
* service слой не изменён

---

## Требования к результату от агента

Агент должен выдать:

1. список созданных файлов
2. структуру controller слоя
3. DTO
4. пример конфигурации `.env`
5. команды запуска
6. описание feature flag поведения
7. подтверждение, что service слой не изменён

````

```md
Прочитай и используй:

1. `prompts/global.md`
2. `prompts/lab-2.1.md`
3. `prompts/lab-2.2.md`

Твоя задача: реализовать **Этап 2.2 (REST API)**.

## Важно

- не изменяй service слой
- не добавляй бизнес-логику
- реализуй только controller слой и инфраструктуру вокруг него

## Что нужно сделать

1. Реализовать NestJS controllers
2. Реализовать DTO
3. Связать endpoints с service layer
4. Реализовать feature flag `AUTH_ENABLED`
5. Реализовать mock authentication при `AUTH_ENABLED=false`
6. Подготовить auth abstraction для будущего Keycloak

## Правила

- controllers должны быть тонкими
- service слой не трогать
- Prisma не использовать в controller
- DTO не равны Prisma моделям
- ошибки должны маппиться в HTTP

## Проверки

Убедись, что:

- API работает без авторизации (`AUTH_ENABLED=false`)
- API требует auth при `AUTH_ENABLED=true`
- endpoints соответствуют спецификации
- сервис запускается без ошибок

## Ожидаемый результат

Выдай:

1. список файлов
2. структуру controllers
3. DTO
4. пример `.env`
5. команды запуска
6. примеры запросов
7. подтверждение корректной работы feature flag
````
