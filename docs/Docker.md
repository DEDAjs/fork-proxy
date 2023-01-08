
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

    $ docker build --tag dedaca/proxy-server .
    $ docker image ls
    $ docker tag dedaca/proxy-server dedaca/proxy-server:0.1.0
    $ docker push dedaca/proxy-server
    $ docker stop dedaca/proxy-server
    $ docker image rm dedaca/proxy-server

    $ docker run -i -d --entrypoint=bash deda-ps
    

Run the image and helpful commands

    $ docker run -d          \
        --name='deda-ps'     \
        -p '8080:8080/tcp'     \
        -p '4443:4443/tcp'    \
        -u $(id -u):$(id -g) \
        -e 'UID'='1000'      \
        -e 'GID'='1000'      \
        -v $HOME/deda-v3/proxy-server/server/docs/www1/:'/home/dedaca/site':'rw' \
        dedaca/proxy-server
    $ docker ps
    $ docker logs -f deda-ps
    $ docker stop deda-ps

    $ docker rm deda-ps

Debugging

    $ docker run -i -d --entrypoint=bash --name deda-ps  dedaca/proxy-server
    $ docker exec -it deda-ps bash

Docker Compose

    $ docker-compose up --build -d

