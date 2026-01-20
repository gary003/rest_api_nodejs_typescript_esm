FROM node:24-alpine
RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY src ./src
COPY ecosystem.config.js ./
COPY tsconfig.json ./

RUN npm run build:app

EXPOSE 8080

CMD [ "npm", "run", "docker:launch:app" ]
