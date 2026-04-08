# GraphQL-BFF

`graphql-bff` — отдельный NestJS сервис в monorepo, который предоставляет GraphQL API поверх уже реализованного backend REST API.

Ключевые свойства:

- BFF не содержит бизнес-логики
- BFF не работает с БД
- BFF не использует Prisma
- все доменные операции проксируются в backend через HTTP-клиент
- access token просто пробрасывается в backend

## Конфигурация

Минимальные env-переменные:

```env
PORT=3001
BACKEND_API_URL=http://localhost:3000/api/v1
LOG_LEVEL=INFO
```

Пример файла: [`.env.example`](/Users/gadina/Desktop/github/tegeran/apps/graphql-bff/.env.example)

## Запуск

Из корня monorepo:

```bash
npm install
npm --workspace @tegeran/graphql-bff run build
npm --workspace @tegeran/graphql-bff run start:dev
```

Через общий compose:

```bash
docker compose up -d --build postgres keycloak backend graphql-bff
```

GraphQL endpoint:

```text
http://localhost:3001/graphql
```

## Ручное тестирование

Ниже сценарий, который можно повторить в Apollo Sandbox, GraphQL Playground, Postman или через `curl`.

### Перед стартом

1. Поднять инфраструктуру:

```bash
docker compose up -d --build postgres keycloak backend graphql-bff
```

2. Открыть:

```text
http://localhost:3001/graphql
```

3. Подготовить переменные:

- `accessTokenA`
- `accessTokenB`
- `accessTokenC`
- `accessTokenD`
- `userIdD`
- `directChatId`
- `groupChatId`
- `messagesNextCursor`

### Шаг 1. Проверка health

Токен: не нужен

```graphql
query Health {
  health {
    status
  }
}
```

Ожидание: `status = "ok"`.

### Шаг 2. Регистрация пользователя A

Токен: не нужен

```graphql
mutation RegisterA($input: RegisterInput!) {
  register(input: $input) {
    id
    authSubject
    name
    email
  }
}
```

```json
{
  "input": {
    "name": "Alice GraphQL",
    "email": "alice.graphql@example.com",
    "password": "secret123"
  }
}
```

Ожидание: пользователь создан.

### Шаг 3. Регистрация пользователя B

Токен: не нужен

```graphql
mutation RegisterB($input: RegisterInput!) {
  register(input: $input) {
    id
    email
  }
}
```

```json
{
  "input": {
    "name": "Bob GraphQL",
    "email": "bob.graphql@example.com",
    "password": "secret123"
  }
}
```

### Шаг 4. Регистрация пользователя C

Токен: не нужен

```graphql
mutation RegisterC($input: RegisterInput!) {
  register(input: $input) {
    id
    email
  }
}
```

```json
{
  "input": {
    "name": "Charlie GraphQL",
    "email": "charlie.graphql@example.com",
    "password": "secret123"
  }
}
```

### Шаг 5. Логин пользователя A

Токен: не нужен

```graphql
mutation LoginA($input: LoginInput!) {
  login(input: $input) {
    accessToken
    tokenType
    expiresIn
  }
}
```

```json
{
  "input": {
    "email": "alice.graphql@example.com",
    "password": "secret123"
  }
}
```

Сохранить `accessTokenA`.

### Шаг 6. Логин пользователя B

Токен: не нужен

```graphql
mutation LoginB($input: LoginInput!) {
  login(input: $input) {
    accessToken
  }
}
```

```json
{
  "input": {
    "email": "bob.graphql@example.com",
    "password": "secret123"
  }
}
```

Сохранить `accessTokenB`.

### Шаг 7. Логин пользователя C

Токен: не нужен

```graphql
mutation LoginC($input: LoginInput!) {
  login(input: $input) {
    accessToken
  }
}
```

```json
{
  "input": {
    "email": "charlie.graphql@example.com",
    "password": "secret123"
  }
}
```

Сохранить `accessTokenC`.

### Шаг 8. Получение профиля `me` для пользователя A

Токен: `accessTokenA`

Заголовок:

```text
Authorization: Bearer <accessTokenA>
```

```graphql
query Me {
  me {
    id
    authSubject
    name
    email
  }
}
```

Ожидание: профиль Alice.

### Шаг 9. Получение начального списка чатов пользователя A

Токен: `accessTokenA`

```graphql
query Chats {
  chats {
    id
    name
    type
    lastMessage {
      content
      createdAt
    }
  }
}
```

Ожидание: пустой массив или начальное состояние.

### Шаг 10. Создание или получение direct chat по email

Токен: `accessTokenA`

```graphql
mutation DirectChat($input: GetOrCreateDirectChatInput!) {
  getOrCreateDirectChat(input: $input) {
    id
    type
    members {
      role
      user {
        email
      }
    }
  }
}
```

```json
{
  "input": {
    "email": "bob.graphql@example.com"
  }
}
```

Сохранить `directChatId`.

### Шаг 11. Повторный direct chat по тому же email

Токен: `accessTokenA`

Повторить шаг 10.

Ожидание: вернётся тот же `id`, новый direct chat не создаётся.

### Шаг 12. Создание group chat по списку email

Токен: `accessTokenA`

```graphql
mutation CreateGroup($input: CreateGroupChatInput!) {
  createGroupChat(input: $input) {
    id
    name
    type
    members {
      role
      user {
        email
      }
    }
  }
}
```

```json
{
  "input": {
    "name": "Project Team",
    "memberEmails": [
      "bob.graphql@example.com",
      "charlie.graphql@example.com"
    ]
  }
}
```

Сохранить `groupChatId`.

### Шаг 13. Получение списка участников group chat

Токен: `accessTokenA`

```graphql
query ChatMembers($chatId: ID!) {
  chatMembers(chatId: $chatId) {
    role
    user {
      id
      email
      name
    }
  }
}
```

```json
{
  "chatId": "<groupChatId>"
}
```

Ожидание: Alice = `OWNER`, Bob/Charlie = `MEMBER`.

### Шаг 14. Регистрация пользователя D

Токен: не нужен

```graphql
mutation RegisterD($input: RegisterInput!) {
  register(input: $input) {
    id
    email
  }
}
```

```json
{
  "input": {
    "name": "Diana GraphQL",
    "email": "diana.graphql@example.com",
    "password": "secret123"
  }
}
```

### Шаг 15. Логин пользователя D

Токен: не нужен

```graphql
mutation LoginD($input: LoginInput!) {
  login(input: $input) {
    accessToken
  }
}
```

```json
{
  "input": {
    "email": "diana.graphql@example.com",
    "password": "secret123"
  }
}
```

Сохранить `accessTokenD`.

### Шаг 16. Получение `me` для пользователя D

Токен: `accessTokenD`

```graphql
query MeD {
  me {
    id
    email
  }
}
```

Сохранить `userIdD`.

### Шаг 17. Добавление пользователя D в group chat

Токен: `accessTokenA`

```graphql
mutation AddMember($input: AddMemberToChatInput!) {
  addMemberToChat(input: $input) {
    chatId
    userId
    role
    user {
      email
    }
  }
}
```

```json
{
  "input": {
    "chatId": "<groupChatId>",
    "userId": "<userIdD>"
  }
}
```

Ожидание: D добавлен как `MEMBER`.

### Шаг 18. Удаление пользователя из group chat по email

Токен: `accessTokenA`

```graphql
mutation RemoveMember($input: RemoveMemberFromChatInput!) {
  removeMemberFromChat(input: $input)
}
```

```json
{
  "input": {
    "chatId": "<groupChatId>",
    "email": "charlie.graphql@example.com"
  }
}
```

Ожидание: `true`.

### Шаг 19. Отправка сообщения в direct chat

Токен: `accessTokenA`

```graphql
mutation SendDirectMessage($input: SendMessageInput!) {
  sendMessage(input: $input) {
    id
    chatId
    senderId
    content
    createdAt
  }
}
```

```json
{
  "input": {
    "chatId": "<directChatId>",
    "content": "Hello Bob from GraphQL BFF"
  }
}
```

### Шаг 20. Отправка сообщения в group chat

Токен: `accessTokenA`

```graphql
mutation SendGroupMessage($input: SendMessageInput!) {
  sendMessage(input: $input) {
    id
    chatId
    content
    createdAt
  }
}
```

```json
{
  "input": {
    "chatId": "<groupChatId>",
    "content": "Hello team from GraphQL BFF"
  }
}
```

### Шаг 21. Получение сообщений чата с пагинацией

Токен: `accessTokenA`

```graphql
query Messages($chatId: ID!, $limit: Int, $cursor: String) {
  messages(chatId: $chatId, limit: $limit, cursor: $cursor) {
    items {
      id
      content
      createdAt
    }
    nextCursor
    hasMore
  }
}
```

```json
{
  "chatId": "<groupChatId>",
  "limit": 1,
  "cursor": null
}
```

Сохранить `messagesNextCursor`. Если в чате больше одного сообщения, повторить этот же query с `cursor = messagesNextCursor`.

### Шаг 22. Переименование group chat

Токен: `accessTokenA`

```graphql
mutation RenameGroup($input: RenameGroupChatInput!) {
  renameGroupChat(input: $input) {
    id
    name
    type
  }
}
```

```json
{
  "input": {
    "chatId": "<groupChatId>",
    "name": "Renamed Project Team"
  }
}
```

### Шаг 23. Удаление group chat с участниками и сообщениями

Токен: `accessTokenA`

```graphql
mutation DeleteChat($chatId: ID!) {
  deleteChat(chatId: $chatId)
}
```

```json
{
  "chatId": "<groupChatId>"
}
```

Ожидание: `true`.

### Шаг 24. Проверка, что чат удалён

Токен: `accessTokenA`

```graphql
query DeletedChat($id: ID!) {
  chat(id: $id) {
    id
    name
  }
}
```

```json
{
  "id": "<groupChatId>"
}
```

Ожидание: GraphQL error с backend `404`.

### Шаг 25. Подтверждение, что удаление не ломается на связанных сущностях

Смысл этой проверки уже обеспечен предыдущими шагами:

- в чат были добавлены участники
- в чат были отправлены сообщения
- удаление выполнилось успешно через GraphQL mutation
- повторное чтение удалённого чата даёт `404`, а не ошибку foreign key constraint

Если нужно увидеть это явно, открой логи:

```bash
docker compose logs -f backend graphql-bff
```

Ожидание:

- `graphql-bff` логирует вызов `deleteChat`
- backend логирует успешное удаление group chat
- ошибок `foreign key constraint` нет
