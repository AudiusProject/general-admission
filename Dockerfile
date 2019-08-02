FROM node:10-alpine

# RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app
COPY package*.json ./

RUN npm install
COPY . .

EXPOSE 8000

ARG git_sha
ENV GIT_SHA=$git_sha

ENTRYPOINT npm run start
