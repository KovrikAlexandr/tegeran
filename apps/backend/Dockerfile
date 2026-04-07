FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json

RUN npm install

COPY apps/backend apps/backend

WORKDIR /app/apps/backend

RUN npm run db:generate
RUN npm run build

EXPOSE 3000

CMD ["node", "scripts/start-with-migrations.js"]
