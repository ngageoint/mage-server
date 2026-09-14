# Running with Docker

## Mage server image

The Mage Server image contains the core Mage server Node app that consists
of the ReST web service and the Mage web app.  By default, the image also
includes plugins maintained in the [Mage server repository](../plugins/).  There 
are two Mage server Dockerfiles.  The default [Dockerfile](../Dockerfile) builds
and installs all packages from the local source tree.  [`Dockerfile.published`](../Dockerfile.published)
installs published Mage packages from the NPM registry to build a production 
release image.

Build the local development image with the following command from the project 
root.
```bash
docker build -t mage:local .
```
Build the production release image with the following command.
```bash
docker build -t mage-server:<version> -f Dockerfile.published .
```
You can override the package versions in the production image using Docker's
`--build-arg` CLI switch to set the package versions you want in the image.  
Here's an example of building the image with an explicit core service and 
web-app version.
```bash
docker build --build-arg CORE_VERSION=6.7.0 -t mage-server:<version> -f Dockerfile.published .
```

### Private base image

Both Dockerfiles default to a hardened base image hosted in this project's GitHub 
repository.  You will need to create a [personal access token](https://github.com/settings/tokens) the Docker 
CLI can use to [access](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry) the GitHub container registry in order to build with that 
base image.  Alternatively, you can override the base image with an open Node.js
image using a Docker CLI build argument like the following.
```bash
docker build --build-arg DIST_IMAGE=node:26-slim .
```

The hardened [base image](https://registry1.dso.mil/harbor/projects/3/repositories/google%2Fdistroless13%2Fnodejs-24/artifacts-tab) 
is a copy from [Platform One's](https://p1.dso.mil/)  [Iron Bank repository](https://ironbank.dso.mil/about), which is 
based on Google's [distroless Node](https://console.cloud.google.com/artifacts/docker/distroless/us/gcr.io/nodejs24-debian13) image.  
The [source](https://repo1.dso.mil/dsop/google/distroless13/nodejs-24) for the Iron Bank image is available in Platform 
One's [Repo One](https://repo1.dso.mil/) Git hosting service.

The base image is distroless, hence lacks a shell and familiar Linux command line utilities.  To debug the image
or a running container interactively, you'll need to use the `docker debug` command.  For example:
```bash
docker debug mage:local
```

## Docker Compose

You can start a Mage server instance by using [docker compose](https://docs.docker.com/compose/) to start services
defined in Mage's [Compose file](../docker-compose.yml).

The first time you run Mage with Docker, execute the following steps from the directory where you cloned the
Mage Git repository.
```bash
docker compose up -d # build the service images, then create and start the service containers for the first time
```
With all the default settings, you should then be able to browse to
http://localhost:4242 to interact with the Mage web app.

### HTTPS/TLS Reverse Proxy

The Compose file defines a `mage-web-proxy` service based on the `nginx` image.  Uncomment this service block to
enable HTTPS connections to the Mage web app and API.  This may be required for testing the Mage mobile applications
with a locally running server, as well as facilitate testing that resource URLs and links work properly when the core 
Node app is running behind a secure proxy.  The nginx container proxy references the configuration from
[web-proxy/nginx.conf](./web-proxy/nginx.conf).

You'll need to generate a self-signed key-certificate pair for the nginx proxy using `openssl`.  The Compose file 
expects the certificate and key files at `docker/web-proxy/mage-web.crt` and `docker/web-proxy/mage-web.key`, 
respectively.  Both files have entries in `docker/web-proxy/.gitignore` to avoid committing the private key to the 
repository.  There are plenty of tutorials online about creating a self-signed certificate, for example, 
https://www.digitalocean.com/community/tutorials/how-to-create-a-self-signed-ssl-certificate-for-nginx-in-ubuntu-16-04.
Simply replace the file paths as appropriate.

### Interacting with the containers

_NOTE:_ All of the following `docker compose` commands described below assume
you are operating from the [`docker`](docker) directory.

After the initial `up` command, you can use `docker compose stop` and
`docker compose start` to stop and start the service containers.

You can use [`docker compose ps`](https://docs.docker.com/engine/reference/commandline/compose_ps/) to see the state of the Mage service containers.
```bash
$ docker compose ps
NAME                   COMMAND                  SERVICE             STATUS              PORTS
docker-mage-db-1       "docker-entrypoint.s…"   mage-db             running             27017/tcp
docker-mage-server-1   "./mage.service --pl…"   mage-server         running             0.0.0.0:4242->4242/tcp
```
You can use [`docker-compose logs <service>`](https://docs.docker.com/engine/reference/commandline/compose_logs/) to display console logging for a service.
```
$ docker compose logs mage-server
mage-server_1  | 2018-04-26T23:30:30.684Z - info: Starting Mage Server ...
mage-server_1  | 2018-04-26T23:30:31.403Z - info: setting up provision uid
mage-server_1  | 2018-04-26T23:30:31.861Z - info: Using '/var/lib/mage/attachments' as base directory for feature attachments.
mage-server_1  | 2018-04-26T23:30:31.861Z - info: Using '/var/lib/mage/icons' as base directory for Mage icons.
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
root@df8b00beafa2:/# mongo # interact directly with the running Mage database # do some ill-advised things directly to the database
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
