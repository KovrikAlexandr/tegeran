FROM node:22-alpine

ARG NEXT_PUBLIC_GRAPHQL_URL=http://localhost:3001/graphql

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/frontend/package.json apps/frontend/package.json

RUN npm install

COPY apps/frontend apps/frontend

WORKDIR /app/apps/frontend

ENV NEXT_PUBLIC_GRAPHQL_URL=${NEXT_PUBLIC_GRAPHQL_URL}

RUN npm run build

EXPOSE 3002

CMD ["npm", "run", "start"]
