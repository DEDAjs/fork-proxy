FROM node:18.12.1-slim

LABEL Author="Charbel Choueiri <charbel.choueiri@gmail.com"

RUN mkdir -p /home/app
RUN mkdir -p /data

COPY ./docs/www /data
COPY . /home/app


WORKDIR /home/app
CMD ["node", "main.js", "/data/config.json"]
