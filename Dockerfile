FROM node:lts-alpine
ENV NODE_ENV=production
LABEL Author="Charbel Choueiri <charbel.choueiri@gmail.com>"

# Install Certbot and any required dependencies
RUN apk add --no-cache certbot

WORKDIR /home/node/app
COPY . .
RUN chown -R node:node /home/node/app

RUN mkdir /home/node/config
RUN chown -R node:node /home/node/config

EXPOSE 443
EXPOSE 80

USER node
CMD ["node", "main.js", "-c", "/home/node/config"]