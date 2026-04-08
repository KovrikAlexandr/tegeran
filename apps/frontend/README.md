# Frontend

Next.js frontend for the messenger demo.

## Environment

Use the following variables:

```env
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:3001/graphql
PORT=3002
```

## Local run

```bash
npm install
npm --workspace @tegeran/frontend run dev
```

## Build

```bash
npm --workspace @tegeran/frontend run build
```

## Docker

The app can be built with its own `Dockerfile` and is compatible with the root `docker-compose.yml`.
