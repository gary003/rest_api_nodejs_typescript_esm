FROM node:24-alpine
RUN apk add --no-cache curl

WORKDIR /app

# Change ownership of /app to node user
RUN chown node:node /app

# Switch to non-root user
USER node

COPY --chown=node:node package*.json ./

RUN npm ci

COPY --chown=node:node src ./src
COPY --chown=node:node ecosystem.config.js ./
COPY --chown=node:node tsconfig.json ./

RUN npm run build:app

EXPOSE 8080

CMD [ "npm", "run", "docker:launch:app" ]
