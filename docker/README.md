# Running with Docker

You can start a MAGE server by using [docker-compose](https://docs.docker.com/compose/overview/) to start services
defined in MAGE's [Compose file](docker-compose.yml).

The first time you run MAGE with docker, execute the following steps from the directory where you cloned the 
MAGE Git repoistory.

```bash
$ cd ./docker
$ docker-compose up -d # build the service images, then create and start the service containers for the first time
```

With all the default settings, you should then be able to browse to http://localhost:4242 to interact with the MAGE web app.

## Interacting with the containers

_NOTE:_ All of the following `docker-compose` commands described below assume you are operating from the 
[`docker`](docker) directory.

After the initial `up` command, you can use `docker-compose stop` and `docker-compose start` to stop and start the service
containers.

You can use [`docker-compose ps`](https://docs.docker.com/compose/reference/ps/) to see the state of the MAGE service containers.
```bash
$ docker-compose ps
        Name                      Command               State             Ports          
-----------------------------------------------------------------------------------------
docker_mage-db_1       docker-entrypoint.sh mongo ...   Up       0.0.0.0:27017->27017/tcp
docker_mage-server_1   node ./app.js                    Up       0.0.0.0:4242->4242/tcp
```
You can use [`docker-compose logs <service>`](https://docs.docker.com/compose/reference/logs/) to display console logging for a service.
```
$ docker-compose logs mage-server
mage-server_1  | 2018-04-26T23:30:30.684Z - info: Starting MAGE Server ...
mage-server_1  | 2018-04-26T23:30:31.403Z - info: setting up provision uid
mage-server_1  | (node:1) DeprecationWarning: Mongoose: mpromise (mongoose's default promise library) is deprecated, plug in your own promise library instead: http://mongoosejs.com/docs/promises.html
mage-server_1  | 2018-04-26T23:30:31.861Z - info: Using '/var/lib/mage/attachments' as base directory for feature attachments.
mage-server_1  | 2018-04-26T23:30:31.861Z - info: Using '/var/lib/mage/icons' as base directory for MAGE icons.
# etc., etc.
```
While the service containers are up, you can interact with them using [`docker-compose exec`](https://docs.docker.com/compose/reference/exec/)
to run commands in the container.  For example, to get an interactive shell session in the MongoDB container, run
```
$ docker-compose exec mage-db bash
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

The MAGE Docker app consists of two [services](https://docs.docker.com/get-started/part3/#about-services).  The first is
the MongoDB database, and the second is the MAGE server Node.js application.

### MongoDB Image

The MongoDB image is the official MongoDB image available from [Docker Hub](https://hub.docker.com/_/mongo/).  The Compose 
file builds that image unmodified, but uses a custom command to launch MongoDB with specific settings.  The Compose file 
runs MongoDB as the service `mage-db`.

### MAGE Server Image

The Compose file references a custom, local [Dockerfile](server/Dockerfile) based on the official [Node.js](https://hub.docker.com/_/node/)
image to build the MAGE server image.  At build time, the MAGE server Dockerfile downloads an archive of the MAGE server
code from [Github](https://github.com/ngageoint/mage-server).  This defaults to some (hopefully) recent release version of 
the MAGE server, e.g., 5.1.0.  The Dockerfile accepts an [argument](https://docs.docker.com/engine/reference/builder/#arg),
`MAGE_VER`, which you can specify to `docker-compose` like 
```bash
MAGE_VER=develop docker-compose build
```
to build with whatever version of MAGE server you wish.  Github should accept any valid, uniquely identifiable refspec in 
the download URL the Docker file uses, so you could use a branch name, tag name, or commit hash.  By way of the 
```yaml
image: "mage-server:${MAGE_VER:-5.1.0}"
```
entry the Compose file tells Docker to [tag](https://docs.docker.com/get-started/part2/#tag-the-image) the `mage-server`
image with value of `MAGE_VER`.

Be aware that every different value you specify for `MAGE_VER` to `docker-compose build`, Docker will build a separate
`mage-server` image because changing that value modifies the [build stage](https://docs.docker.com/develop/develop-images/multistage-build/)
that downloads the MAGE server baseline.  For example after running
```bash
$ MAGE_VER=5.1.0 docker-compose build
# ... Docker build output
$ MAGE_VER=develop docker-compose build
# ... Docker build output
```
then listing your Docker images ...
```bash
$ docker images
REPOSITORY          TAG                 IMAGE ID            CREATED             SIZE
mage-server         5.1.0               877f79a739b7        8 minutes ago       949MB
mage-server         develop             75a73b7b7c3e        2 days ago          961MB
node                8.11.1              4635bc7d130c        3 weeks ago         673MB
mongo               3.6-jessie          5b1317f8158f        6 weeks ago         366MB
```
... note you now have two `mage-server` images with different version tags, both occupying over 900MB, and both connecting
to the same MongoDB instance.  In some cases you may actually want to do this, to test an upgrade, for example.  Remember 
you can always remove images you don't need.
```bash
$ docker rmi mage-server:develop
```
Another consequence of building the images using the `MAGE_VER=xxx docker-compose build` syntax is that you must then 
supply the same `MAGE_VER=xxx` value when you run the subsequent `docker-compose up -d` command.  Otherwise, `docker-compose`
will rebuild the `mage-server` image with the version the Compose file defines if it differs from the one you specified on 
the command line, and run a container with that version instead.

### Bind Mounts

The Compose file uses [bind mounts](https://docs.docker.com/storage/bind-mounts/) for the MongoDB database directory,
database log path, and MAGE server [resources](../README.md#mage-local-media-directory).  By default, the source paths 
of those bind mounts are `database/data`, `database/log`, and `server/resources`, respectively.  You can change the 
source paths according to your environment and needs.

With these bind mounts, the MAGE server will retain its data on your host file system in directories you can explore
and manage yourself.  For example, this setup allows you to mount a directory into the MAGE server container from a 
[FUSE-based](https://github.com/libfuse/libfuse) file system, which might provide extra functionality like 
[encryption](https://www.veracrypt.fr) or [remote mounting](https://github.com/libfuse/sshfs) transparently to the 
Docker container and MAGE application.  If you don't have any requirements of that sort, you can modify the Compose file
to use [Docker-managed volumes](https://docs.docker.com/storage/volumes/) instead of bind mounts.

### Ports

The only container port the Compose file exposes to the host by default is 4242 on the `mage-server` service to allow
HTTP connections from your host web browser to the MAGE server running in the Docker container.  In a production 
environment you could add another service in the Compose file to run an [nginx](https://hub.docker.com/_/nginx/)
or [httpd](https://hub.docker.com/_/httpd/) reverse proxy with TLS or other security measures in front of the MAGE
server Node application.  In that case you would remove the 
```yaml
ports:
  - 4242:4242
```
lines from the Compose file under the `mage-server` service entry.  You would then most likely add the mapping
```yaml
ports:
  - 443:443
```
to the reverse proxy's service definition.

### Environment Settings

You can configure the MAGE server Docker app using [environment variables](../README.md#mage-environment-settings).
The Compose file does this by necessity to configure the MongoDB URL for the MAGE server.
```yaml
environment: 
    MAGE_MONGO_URL: mongodb://mage-db:27017/magedb
```

