FROM node:24-alpine

WORKDIR /app

COPY package*.json ./

RUN ["npm", "install" ]

COPY . .

EXPOSE 8080

RUN [ "npm", "run", "build:app" ]

HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:8080/ || exit 1

CMD [ "npm", "run", "docker:launch:app" ]
