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
mage-server_1  | (node:1) DeprecationWarning: Mongoose: mpromise (mongoose's default promise library) is deprecated, plug in your own promise library instead: http://mongoosejs.com/docs/promises.html
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

### HTTPS/TLS reverse proxy

Then `mage-web-proxy` service is optional when developing and running on
localhost, but highly recommended when running MAGE Server on publicly
accessible servers.  The service in `docker-compose.yml` uses the official
nginx docker image with an appropriate [configuration](web/nginx.conf).  This
is an example of setting up a reverse proxy in front of the Node server to
enforce HTTPS/TLS connections to the server.  Of course, you could use any
reverse proxy you see fit, such as [Apache HTTP Server](https://httpd.apache.org/)
or an AWS [Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html).  To run your MAGE server behind the TLS
reverse proxy, peform the following modifications to `docker-compose.yml`.
1. Comment the `ports` block for the `mage-server` service to disallow
  connections directly to the Node.js server.
1. Uncomment the block with the `mage-web-proxy` service key.

For testing in a development environment, you can create a self-signed server
certificate for nginx to use.  The following OpenSSL command, run from the
directory of this README, will create a self-signed server certificate and
private key in the `web` directory that should allow the MAGE mobile app to
connect to nginx.  Replace the values of the `SUBJ_*` variables at the
beginning of the command with your own values.
```
SUBJ_C="XX" \
SUBJ_ST="State" \
SUBJ_L="Locality" \
SUBJ_O="Organization" \
SUBJ_OU="Organizational_Unit" \
SUBJ_CN="HOST_NAME_OR_IP"; \
openssl req -new -nodes -x509 -newkey rsa:4096 -sha256 -days 1095 \
-out web/mage-web.crt -keyout web/mage-web.key \
-config <(cat /etc/ssl/openssl.cnf <(printf "[mage]\n  \
subjectAltName=DNS:$SUBJ_CN\n  \
basicConstraints=CA:true")) \
-subj "/C=$SUBJ_C/ST=$SUBJ_ST/L=$SUBJ_L/O=$SUBJ_O/OU=$SUBJ_OU/CN=$SUBJ_CN" \
-extensions mage; \
unset SUBJ_C SUBJ_ST SUBJ_L SUBJ_O SUBJ_OU SUBJ_CN
```
The preceding command creates `web/mage-web.crt` and `web/mage-web.key`, which
the nginx configuration file references.  The `<(...)` operator is Unix process
substitution and allows treating the enclosed command output as a file.  The
`subjectAltName` and `basicConstraints` arguments are necessary to install the
public certificate, `mage-web.crt`, as a trusted authority on a mobile device.

**IMPORTANT** If you intend to connect to your reverse proxy from a mobile
device or simulator/emulator running the MAGE mobile app, make sure that the
value of the `SUBJ_CN` variable matches the IP address of your MAGE Server
host on your network, or the resolvable host name of the host.  TLS connections
will not succeed if Common Name and Subject Alternative Name fields in the
public certificate do not match the host name.

When running with the reverse proxy and default port settings in the Compose
file, your server will be available at https://localhost:5443.  If you are
connecting from a mobile device on the same network.

### Bind mounts

The Compose file uses [bind mounts](https://docs.docker.com/storage/bind-mounts/)
for the MongoDB database directory, database log path, and MAGE server
[resources](../README.md#mage-local-media-directory).  By default, the source
paths of those bind mounts are `database/data`, `database/log`, and
`server/resources`, respectively.  You can change the source paths according to
your environment and needs.

With these bind mounts, the MAGE server will retain its data on your host file
system in directories you can explore and manage yourself.  For example, this
setup allows you to mount a directory into the MAGE server container from a
[FUSE-based](https://github.com/libfuse/libfuse) file system, which might
provide extra functionality like [encryption](https://www.veracrypt.fr) or
[remote mounting](https://github.com/libfuse/sshfs) transparently to the
Docker container and MAGE application.  If you don't have any requirements of
that sort, you can modify the Compose file to use [Docker-managed volumes](https://docs.docker.com/storage/volumes/) instead of bind mounts.

### Ports
The only port the Compose file exposes to the host by default is 4242 on the
`mage-server` service to allow HTTP connections from your host web browser to
the MAGE server running in the Docker container.  In a production environment,
you could add another service in the Compose file to run an
[nginx](https://hub.docker.com/_/nginx/) or [httpd](https://hub.docker.com/_/httpd/)
reverse proxy with TLS or other security measures in front of the MAGE Server
Node application.  In that case you would remove the
```yaml
ports:
  - 4242:4242
```
lines from the Compose file under the `mage-server` service entry.  You would
then most likely add the mapping
```yaml
ports:
  - 443:443
```
to the reverse proxy's service definition.

You can also allow connections from your host to the MongoDB database container
by uncommenting the `ports` block of the `mage-db` service.  You would then be
able to connect directly to the MongoDB database using the `mongo` client on
your host machine to examine or modify the database contents.

### Environment settings

You can configure the MAGE server Docker app using [environment variables](../README.md#mage-environment-settings).
The Compose file does this by necessity to configure the MongoDB URL for the MAGE server.
```yaml
environment:
    MAGE_MONGO_URL: mongodb://mage-db:27017/magedb
```

