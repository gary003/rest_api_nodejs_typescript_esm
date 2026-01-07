FROM node:24-alpine
RUN apk update && apk upgrade --no-cache

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY src ./src
COPY ecosystem.config.js ./
COPY eslint.config.mjs ./
COPY tsconfig.json ./

EXPOSE 8080

RUN npm run build:app

CMD [ "npm", "run", "docker:launch:app" ]
