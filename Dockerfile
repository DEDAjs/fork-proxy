FROM node:18.12.1-slim

LABEL Author="Charbel Choueiri <charbel.choueiri@gmail.com>"

RUN mkdir -p /home/app

COPY . /home/app

EXPOSE 8080
EXPOSE 4443

WORKDIR /home/app
CMD ["node", "main.js", "-c", "/data/"]
