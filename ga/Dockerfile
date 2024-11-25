FROM node:18.16
RUN apt-get install make

WORKDIR /home/node/app
COPY package*.json ./

RUN npm install
COPY . .
RUN npm run clean
RUN npm run tsc
RUN npm run copy-files

EXPOSE 8000

ARG git_sha
ENV GIT_SHA=$git_sha

ENTRYPOINT npm run start:build
