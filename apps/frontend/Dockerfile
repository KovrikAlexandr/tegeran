FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/frontend/package.json apps/frontend/package.json

RUN npm install

COPY apps/frontend apps/frontend

WORKDIR /app/apps/frontend

RUN npm run build

EXPOSE 3002

CMD ["npm", "run", "start"]
