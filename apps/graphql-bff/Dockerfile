FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/graphql-bff/package.json apps/graphql-bff/package.json

RUN npm install

COPY apps/graphql-bff apps/graphql-bff

WORKDIR /app/apps/graphql-bff

RUN npm run build

EXPOSE 3001

CMD ["node", "dist/main.js"]
