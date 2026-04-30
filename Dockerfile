FROM node:24-alpine
RUN apk add --no-cache curl build-base python3

WORKDIR /app

# Change ownership of /app to node user
RUN chown -R node:node /app

# Switch to non-root useré
USER node

COPY --chown=node:node package*.json ./

RUN npm install --legacy-peer-deps

COPY --chown=node:node src ./src
COPY --chown=node:node ecosystem.config.js ./
COPY --chown=node:node tsconfig.json ./

# Copy .env file for production (optional)
# COPY --chown=node:node .env ./

RUN npm run build:app

EXPOSE 8080

CMD [ "npm", "run", "docker:launch:app" ]
