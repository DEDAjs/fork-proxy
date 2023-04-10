
# Install Docker

Install docker using any method. Here is a helpful link:

https://docs.docker.com/engine/install/

Also see

https://docs.docker.com/engine/install/linux-postinstall/

On ubuntu

    $ sudo snap install docker

After installation Add user to docker group:

    $ sudo groupadd docker
    $ sudo usermod -aG docker $USER

Reboot for the commands to take affect.

    $ docker login
    $ cat $HOME/snap/docker/2285/.docker/config.json

# Build Docker Image

Here are some helpful commands

    $ docker build --tag dedaca/fork-proxy .
    $ docker image ls
    $ docker tag dedaca/fork-proxy dedaca/fork-proxy:0.2.0
    $ docker push dedaca/fork-proxy
    $ docker stop dedaca/fork-proxy
    $ docker image rm dedaca/fork-proxy

    $ docker run -i -d --entrypoint=bash fork-proxy
    

Run the image and helpful commands

    $ docker run -d             \
        --name='fork-proxy'     \
        -p '8080:8080/tcp'     \
        -p '4443:4443/tcp'    \
        -u $(id -u):$(id -g) \
        -e 'UID'='1000'      \
        -e 'GID'='1000'      \
        -v $HOME/deda-v3/proxy-server/server/docs/www1/:'/home/dedaca/site':'rw' \
        dedaca/fork-proxy
    $ docker ps
    $ docker logs -f fork-proxy
    $ docker stop fork-proxy

    $ docker rm fork-proxy

Debugging

    $ docker run -i -d --entrypoint=bash --name fork-proxy  dedaca/fork-proxy
    $ docker exec -it fork-proxy bash

Docker Compose

    $ docker-compose up --build -d

