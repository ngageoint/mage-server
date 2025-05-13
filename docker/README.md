# Running with Docker

## MAGE server image

The MAGE Server image contains the the core MAGE server Node app that consists
of the ReST web service and the MAGE web app.  By default, the image also
includes plugins maintained in the [MAGE server repository](../plugins/).  By
default, the server [Dockerfile](./server/Dockerfile) pulls the latest tagged
versions from the NPM registry.  You can override the version using Docker's
`--build-arg` CLI switch to set the package versions you want in the image.
If you are building on Apple Silicon hardware, use `--platform linux/amd64` so
the built image platform matches the base image platform.  Here's an example of
building the image with an explicit service version.
```bash
$ cd ./docker/server
$ docker build --platform linux/amd64 --build-arg service_version=6.2.10 -t mage-server:<version> .
```

The Iron Bank [Dockerfile](./server/Dockerfile.ironbank) uses a different,
hardened [base image](https://ironbank.dso.mil/repomap/details;registry1Path=opensource%252Fnodejs%252Fdebian%252Fnodejs)
from  US DoD's [Iron Bank](https://ironbank.dso.mil/about) repository.  The
Dockerfile builds exactly the same as the standard Dockerfile.

## Docker Compose

You can start a MAGE server by using [docker compose](https://docs.docker.com/compose/) to start services
defined in MAGE's [Compose file](docker-compose.yml).

The first time you run MAGE with Docker, execute the following steps from the directory where you cloned the
MAGE Git repository.
```bash
$ cd ./docker
$ docker compose up -d # build the service images, then create and start the service containers for the first time
```
If you want to use a MAGE server image tagged with a different version than
the `mage-server` Compose service currently defines, prepend the `MAGE_VERSION`
environment variable to the command.
```bash
$ MAGE_VERSION=6.3.0-beta.1 docker compose up -d
```
With all the default settings, you should then be able to browse to
http://localhost:4242 to interact with the MAGE web app.

## Interacting with the containers

_NOTE:_ All of the following `docker compose` commands described below assume
you are operating from the [`docker`](docker) directory.

After the initial `up` command, you can use `docker compose stop` and
`docker compose start` to stop and start the service containers.

You can use [`docker compose ps`](https://docs.docker.com/engine/reference/commandline/compose_ps/) to see the state of the MAGE service containers.
```bash
$ docker compose ps
NAME                   COMMAND                  SERVICE             STATUS              PORTS
docker-mage-db-1       "docker-entrypoint.s…"   mage-db             running             27017/tcp
docker-mage-server-1   "./mage.service --pl…"   mage-server         running             0.0.0.0:4242->4242/tcp
```
You can use [`docker-compose logs <service>`](https://docs.docker.com/engine/reference/commandline/compose_logs/) to display console logging for a service.
```
$ docker compose logs mage-server
mage-server_1  | 2018-04-26T23:30:30.684Z - info: Starting MAGE Server ...
mage-server_1  | 2018-04-26T23:30:31.403Z - info: setting up provision uid
mage-server_1  | 2018-04-26T23:30:31.861Z - info: Using '/var/lib/mage/attachments' as base directory for feature attachments.
mage-server_1  | 2018-04-26T23:30:31.861Z - info: Using '/var/lib/mage/icons' as base directory for MAGE icons.
# etc., etc.
```
While the service containers are up, you can interact with them using
[`docker compose exec`](https://docs.docker.com/engine/reference/commandline/compose_exec/)
to run commands in the container.  For example, to get an interactive shell session in the MongoDB container, run
```
$ docker compose exec mage-db bash
root@df8b00beafa2:/# ps -ef
UID        PID  PPID  C STIME TTY          TIME CMD
mongodb      1     0  0 07:16 ?        00:03:47 mongod --dbpath /data/mage --logpath /var/log
root        67     0  0 22:37 pts/0    00:00:00 bash
root        73    67  0 22:37 pts/0    00:00:00 ps -ef
root@df8b00beafa2:/# mongo # interact directly with the running MAGE database # do some ill-advised things directly to the database
MongoDB shell version v3.6.3
connecting to: mongodb://127.0.0.1:27017
MongoDB server version: 3.6.3
Welcome to the MongoDB shell.
For interactive help, type "help".
For more comprehensive documentation, see
	http://docs.mongodb.org/
Questions? Try the support group
	http://groups.google.com/group/mongodb-user
Server has startup warnings:
2018-04-25T17:06:06.133+0000 I CONTROL  [initandlisten]
2018-04-25T17:06:06.133+0000 I CONTROL  [initandlisten] ** WARNING: Access control is not enabled for the database.
2018-04-25T17:06:06.133+0000 I CONTROL  [initandlisten] **          Read and write access to data and configuration is unrestricted.
2018-04-25T17:06:06.133+0000 I CONTROL  [initandlisten]
> use magedb
switched to db magedb
> show collections
cappedlocations
counters
devices
events
layers
locations
logins
migrations
roles
settings
tokens
users
>
```

## Details

### App Services

The MAGE Server Docker app consists of three service containers: the MongoDB
database, the MAGE Node.js app, and the optional nginx TLS reverse proxy.

### MongoDB

The MongoDB image is the official MongoDB image available from [Docker Hub](https://hub.docker.com/_/mongo/).  The Compose
file builds that image unmodified, but uses a custom command to launch MongoDB with specific settings.  The Compose file
runs MongoDB as the service `mage-db`.

### MAGE server

The Compose file references a custom, local [Dockerfile](server/Dockerfile) based on the official [Node.js](https://hub.docker.com/_/node/)
image to build the MAGE server image.  At build time, the MAGE server Dockerfile
copies whatever MAGE server package tarballs you supply into the MAGE server
image, which might not match the default version the Compose currently defines.
If you want the MAGE server image that Compose builds to have a different tag,
override the `MAGE_VERSION` default value in the Compose file.
```bash
MAGE_VERSION=6.2.0 docker compose build
```
By way of the
```yaml
image: "mage-server:${MAGE_VERSION:-6.1.2}"
```
entry, the Compose file tells Docker to [tag](https://docs.docker.com/get-started/part2/#tag-the-image)
the `mage-server` image Compose builds with the value of `MAGE_VERSION`.

Be aware that, after overriding the default `MAGE_VERSION` value, if you then
use `docker compose up -d` without the same `MAGE_VERSION=xxx` override,
Compose will simply add a tag for the default version to the previously built
image.  So, for example, if the Compose file default for `MAGE_VERSION` is
`6.2.0`, and you
```bash
$ MAGE_VERSION=6.3.0-beta.1 docker compose build
docker compose up -d
```
you will end up wth one image that has two tags `6.2.0` and `6.3.0-beta.1`.
```bash
$ docker images
REPOSITORY               TAG            IMAGE ID       CREATED        SIZE
mage-server              6.2.0          34093daa6c4e   2 hours ago    522MB
mage-server              6.3.0-beta.1   34093daa6c4e   2 hours ago    522MB
```
Note the same values in the `IMAGE ID` column in the example output, along with
different `TAG` values.



