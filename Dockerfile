FROM node:18.12.1-slim

LABEL Author="Charbel Choueiri <charbel.choueiri@gmail.com>"

COPY . /home/node/app
RUN chown -R node:node /home/node/app

RUN mkdir /home/node/config
RUN chown -R node:node /home/node/config

USER node
WORKDIR /home/node/app
CMD ["node", "main.js", "-c", "/home/node/config"]

