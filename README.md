# MAGE Web Service & Web App

The [MAGE](https://ngageoint.github.io/MAGE) platform, provides
mobile situational awareness and data collection capabilities.  This project comprises the ReST API web service the MAGE
client apps use to submit and fetch MAGE data, as well as the browser-based web app.  The MAGE web app provides user
interfaces to view and edit MAGE observations similar to the MAGE mobile apps, and additionally provides the
administrative UI to manage the MAGE server settings, access control, events, data collection forms, etc.

MAGE was developed at the National Geospatial-Intelligence Agency (NGA) in collaboration with BIT Systems. The
government has "unlimited rights" and is releasing this software to increase the impact of government investments by
providing developers with the opportunity to take things in new directions. The software use, modification, and
distribution rights are stipulated within the [Apache license](LICENSE).

## Technology stack

MAGE is built using the [MEAN stack](https://en.wikipedia.org/wiki/MEAN_(software_bundle)).  The components of the MEAN
stack are as follows:
* [MongoDB](https://www.mongodb.com/) - a NoSQL JSON document database
* [Express.js](http://expressjs.com/) - a web server framework for Node to handle ReST API requests
* [Angular](https://angular.io/) - a JavaScript MVC framework for web app front-ends
* [Node.js](https://nodejs.org/) - a software platform for scalable server-side and networking applications.

The MAGE server code is [TypeScript](https://www.typescriptlang.org/) for strong typing, which transpiles to JavaScript
that runs on Node.js.  At the time of this writing, the transition of legacy JavaScript to TypeScript is still in
progress.

## Project structure

The MAGE server project is essentially a monorepo with several NPM package components that assemble into a running
server instance.

### [`service`](./service/)

The `service` directory contains the `@ngageoint/mage.service` package.  This is the backend ReST web service that the
web and mobile apps consume.

### [`web-app`](./web-app/)

The `web-app` directory contains the `@ngageoint/mage.web-app` package.  The package is the bundled, [Angular](https://angular.io)-based
web app MAGE client that includes standard user functionality as well as access administrative functions.

### [`core-lib`](./web-app/projects/core-lib/)

The `core-lib` directory is a descendant of the `web-app` directory that contains the `@ngageoint/mage.web-core-lib`
package.  The package is an Angular library that includes shared elements that both the web app uses, and that web
plugins can use to add custom UI elements to the web app.

### [`instance`](./instance/)

The `instance` directory is a development instance of the MAGE server whose dependencies are the relative paths to the
other packages in the project.  This is useful as an example of how to assemble and configure a MAGE server instance,
as well as to run and test the server during development.

### [`plugins`](./plugins/)

The `plugins` directory contains various plugin packages that the MAGE team maintains as part of the MAGE server open
source project.  Some of these are automatically bundled with MAGE server releases, and some serve as examples and/or
development utilities.

## Running a MAGE server

The MAGE server Node.js app is generally intended to run on Unix-like platforms.  The server _should_ run on Windows,
but be aware some path-separator related bugs may exist

### Install Node.js

The MAGE server is a [Node.js](https://nodejs.org) application, so of course you'll need to install Node on your
platform of choice.  [Node Version Manager](https://github.com/nvm-sh/nvm) is a nice tool to use for installing and
managing different versions of Node, as opposed to various package managers.  At the time of this writing, MAGE
requires Node > 18.x.  Developers should use the latest LTS, 20.x at the time of this writing.

### Install MongoDB

Before running a MAGE server, you'll need to install and start [MongoDB](https://www.mongodb.com/try/download/community).
At the time of this writing, MAGE supports MongoDB version 6.x (6.0).

### Install MAGE server packages

Starting with release [6.2.2](https://github.com/ngageoint/mage-server/releases/tag/6.2.2), the MAGE server packages
are available from the [NPM registry](https://npmjs.com).
```bash
mkdir mage
cd mage
npm install --omit dev \
@ngageoint/mage.service \
@ngageoint/mage.web-app \
@ngageoint/mage.image.service \
```
That will yield a `package.json` file that looks something like
```json
{
  "dependencies": {
    "@ngageoint/mage.image.service": "^1.0.4",
    "@ngageoint/mage.service": "^6.2.12",
    "@ngageoint/mage.web-app": "^6.2.12"
  }
}
```
as well as a `package-lock.json` file and `node_modules` directory containing all of the MAGE server's dependencies.

### Register plugins

As the example instance [configuration](./instance/config.js) demonstrates, you'll need to tell the MAGE service what
plugins to load.  See the `plugins` entry in the configuration object, as well as the [plugins readme](./plugins/README.md).
Note that the `@ngageoint/mage.image.service` package in the dependency list above is a plugin package, and
[resides](./plugins/image/service) in this monorepo.

### Run `mage.service` script

The `@ngageoint/mage.service` package includes a [`mage.service` [bin script](https://docs.npmjs.com/cli/v8/configuring-npm/package-json#bin) for starting
the server process.  From the `instance` directory, you can run `npx @ngageoint/mage.service --help` to see the configuration
options.  Also, the [`instance`](./instance) directory in this project has an example [configuration script](./instance/config.js)
which the `mage.service` script would load with the `-C` flag, e.g., `mage.service -C config.js`.

On Windows Server installations, running the command `node node_modules\@ngageoint\mage.service\bin\mage.service.js` in the `instance` directory will execute the `mage.service` script.

#### Configuration merging

Because the `mage.service` script uses the [Commander](https://www.npmjs.com/package/commander) library, you
can set most of the configuration options with environment variables and/or command line switches.  You can also pass
options from a JSON file or JSON string literal via the `-C (or --config, or MAGE_CONFIG environment variable)` command
line switch.  The `mage.service` script merges options from command line switches, environment variables, and JSON
object, in descending order of precedence.  This enables you to have a base configuration file, then override the
file's entries with environment variables and/or command line switches as desired.  The full configuration object for
the `-C`/`MAGE_CONFIG` environment variable must have the following form.
```json
{
  "mage": {
    "address": "0.0.0.0",
    "port": 1234,
    // etc.
  }
}
```
The `-C` option can be a path to a `.json` file that contains the configuration object, or a Node JavaScript module
whose export is a configuration object,
```javascript
module.exports = {
  mage: {
    // config options ...
  }
}
```
or a literal JSON value.
```bash
mage.service -C /mage/config.json
# or
mage.service -C /mage/config.js
# or
mage.service -C '{ "mage": { "mongo": { "connTimeout": 5000 }}}'
```
To see your full effective configuration, add the `--show-config` switch to the command, and the `mage.service` will
print the configuration as a JSON string and exit without starting the server.
```
<MAGE_*=value...> npx @ngageoint/mage.service <options...> --show-config
```
By default, the MAGE server will attempt to create and use a directory at `/var/lib/mage` for storing data and media
such as videos, photos, and icons.  If the system user account that runs the MAGE server does not have permission to
create that directory, you must create it before starting the server.  Of course you can change the directories the
server uses through the script command line switches and/or environment variables.

For convenience, the MAGE server project contains an [environment script](./service/src/environment/magerc.sh) that you
can copy and customize.  You can configure the MAGE system user account to source the script at login.

The Node MAGE server runs on port 4242 by default.  You can access the MAGE web app in your web browser at
[http://127.0.0.1:4242](http://127.0.0.1:4242) if you are running MAGE locally.

### Running with [Docker](https://www.docker.com/what-docker)

Refer to the [Docker README](docker/README.md) for details on running the MAGE server using Docker.

### Production notes

When running a publicly accessible production server, consider the following points.

#### Configuration location

If all of your MAGE server configuration options come from environment variables, as should be the case with most
cloud server deployments, you will not need to worry about the location of a configuration file.  If you are using
a JSON or JavaScript module configuration file, be sure to the store the file in a location outside where you have
install the MAGE server packages.  For example, if you installed the MAGE server in `/opt/mage`, keep your
configuration in some non-overlapping directory like `/etc/mage.json`.  That way, if you decide to delete the contents
of `/opt/mage` and start fresh, your configuration will remain intact.

#### Running with `forever`

Use a tool like [`forever`](https://www.npmjs.com/package/forever) to run the MAGE server process as a daemon in a
production environment.  `forever` will restart the MAGE server process if it happens to terminate unexpectedly.
First, you'll need to install `forever`.
```bash
npm install -g forever
```
To run the MAGE server with `forever`, you can start the server like the following, assuming you are in the directory
where you have installed the MAGE server packages.
```bash
forever start ./node_modules/.bin/mage.service <...options>
```
NOTE: The `forever` readme now indicates that the project no longer has a dedicated developer and is totally reliant
on community updates.  Try using the newer tools [pm2](https://pm2.keymetrics.io/) or [nodemon](https://nodemon.io/)
for running `mage.service` persistently in production.

#### Running as a Windows Service
To continuously run mage.service on a windows environment, it is recommended to create a windows service using a tool such as [`node-windows`](https://github.com/coreybutler/node-windows).

First you'll need to install `node-windows`
```bash
npm install -g node-windows
```
Then a script is needed to configure and create the windows service.
```js
var Service = require('node-windows').Service;

// Create a new service object
var svc = new Service({
  name:'Mage Service',
  description: 'To run MAGE Server as a windows service',
  script: '{MAGE Install Directory}\\node_modules\\@ngageoint\\mage.service\\bin\\mage.service.js',
  nodeOptions: [
  ]
  //, workingDirectory: '...'
  //, allowServiceLogon: true
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install',function(){
  svc.start();
});

svc.install();
```
Upon running the created script, a new Windows service will be created matching the name given. This service can then be configured to automatically start by the windows server.

#### HTTPS/TLS

When running a MAGE server in a publicly accessible production environment, as with any web application, you should use
a reverse proxy such as [Apache HTTP Server](https://httpd.apache.org/) or [NGINX](https://nginx.org/) to force
external connections to use HTTPS and run the MAGE server Node process on a private subnet host.  The MAGE server Node
application itself does not support HTTPS/TLS connections.

**IMPORTANT:** Be sure your reverse proxy properly sets the `X-Forwarded-Host` and `X-Forwarded-Proto` headers properly.
The MAGE Node.js app builds URLs, via [Express.js](https://expressjs.com/en/4x/api.html#req.hostname), that MAGE clients
use to request resources.

For Microsoft ISS installations, in addition to running a reverse proxy, you must configure ISS to preserve
host headers. To do this, execute the following command:
```bash
\Windows\System32\inetsrv\appcmd.exe set config -section:system.webServer/proxy -preserveHostHeader:true /commit:apphost
```

#### Cloud Foundry deployment

MAGE uses the [cfenv](https://github.com/cloudfoundry-community/node-cfenv) Node module to read settings from Cloud Foundry's
[environment variables](https://docs.cloudfoundry.org/devguide/deploy-apps/environment-variable.html).  If Cloud Foundry's
environment variables are present, they will take precedence over any of their counterparts derived from the
[magerc.sh](environment/env.js) file.  This pertains mostly to defining the connection to the MongoDB server as a bound service
in Cloud Foundry, for which Cloud Foundry should supply the connection string and credentials in the `VCAP_SERVICES` value.

### Upgrading MAGE server

Upgrading the MAGE server essentially consists of the same process as [installing for the first time](#install-mage-server-packages).
1. As above, install the desired versions of the packages.
1. Stop your current MAGE server if it is running.
1. *_[BACK UP YOUR DATABASE](https://docs.mongodb.com/manual/core/backups/)!_* (You already do that regularly, right?)
1. Start your new MAGE server, which will automatically run any database [migrations](./service/src/migrations) present in
   the new version.

## Building from source

First, clone the MAGE server GitHub repository, or download a release source tarball and extract the contents to an
empty directory, such as `mage-server`.  The project has a monorepo structure.  The main packages to build are [`@ngageoint/mage.service`](./service/)
and [`@ngageoint/mage.web-app`](./web-app/).  There are more optional packages in the [`plugins`](./plugins/)
directory.  The [`instance`](./instance/) package is an example of assembling all the packages into a running MAGE
server instance.

The project's root [`package.json`](./package.json) provides convenience script entries to install, build, and run
the MAGE server components.

Download and install the dependencies:

    git clone git@github.com:ngageoint/mage-server.git
    cd mage-server
    npm install

Build the app without plugins

    npm run build

Optional: Build the app with plugins (arcgis and sftp)

    npm run build-all

Run an instance of mongodb via Docker Desktop:

    docker run -d -p 27017:27017 mongo:6.0.4

Run the app with the `instance/config.ts` settings

    npm start

If the monogo database is up and running and everything is built, you should see a message like:

    2025-05-13T20:12:36.120Z - info: MAGE Server listening at address 127.0.0.1 on port 4242

Open a browser to: <http://127.0.0.1:4242>. If the ArcGIS and SFTP plug-ins were built, you'll see those tabs on the sidebar in Settings.

As you make changes, you can either build the entire app `npm run build` in the root directory, or only the parts that you are working on (web-app, service, plugin, etc.).

## Running from source

To run the Mage server directly from your _built_ source tree, build the `service`, `web-app`, and any plugin packages 
you want to run as described in the above section.  Then, from the `instance` directory, run
```shell
npm run start
```
That [NPM script](./instance/package.json) will run the `mage.service` script from your working tree using the 
[configuration](./instance/config.js) from the instance directory.  You can modify that configuration to suit
your needs.

### Local runtime issues

You may run into some problems running the Mage instance from your working tree due to NPM's dependency installation
behavior and/or Node's module resolution algorithm.  For example, if you are working on a plugin within this core
Mage repository, you may see errors as plugins initialize.  This is usually a null reference error that looks something 
like
```
2024-08-23T02:42:52.783Z - [mage.image] intializing image plugin ...
...
/<...>/mage-server/plugins/image/service/lib/processor.js:53
            return yield stateRepo.get().then(x => !!x ? x : stateRepo.put(exports.defaultImagePluginConfig));
                                   ^

TypeError: Cannot read properties of undefined (reading 'get')
    at /<...>/mage-server/plugins/image/service/lib/processor.js:53:36
```
This is usually because the plugin package has a peer depedency on `@ngageoint/mage.service`, which NPM pulls from the
public [registry](https://www.npmjs.com/package/@ngageoint/mage.service) and installs into the plugin's `node_modules` 
directory.  However, your local Mage instance references `@ngageoint/mage.service` package from the local relative
path.  This results in your instance having two copies of `@ngageoint/mage.service` - one from your local build linked
in the top-level `instance/node_modules` directory, and one from the registry in the plugin's `node_modules` directory.
In the case of the error above, this results in a discrepancy during dependency injection because the Mage service
defines unique `Symbol` constants for plugins to indicate which elements they need from their host Mage service.  In 
the plugin's modules, Node resolves these symbol constants and any other core `@ngageoint/mage.service` modules from
the plugin's copy of the package, as opposed to the relative package installed at the instance level.  This is why you
must ensure that you link the working tree core Mage service package in your plugin working tree, as the above 
instructions state.
```shell
~/my_plugin % npm ci
~/my_plugin % npm link <relative path to mage server repo>/service
```
Be aware that NPM's dependency resolution will delete this symbolic link every time you run `npm install`, 
`npm install <dependency>`, or `npm ci` for the plugin, so always `npm link` your relative Mage service
dependency again after those commands.

If you encounter other unexpected issues running locally with plugins, especially reference errors, or other
discrepancies in values the core modules define, check that the core service package is still linked properly
in your plugin working tree.  You can check using the `npm ls` command as follows.
```shell
% npm ls @ngageoint/mage.service
@ngageoint/mage.image.service@1.1.0-beta.1 /<...>/mage-server/plugins/image/service
└── @ngageoint/mage.service@6.3.0-beta.6 -> ./../../../service
```

## Docker Setup
The docker directory includes documentation and dockerfiles for building using the release npm packages. The root Dockerfile and docker-compose.yml are used for building and running a dockerfile from the source/local code. Simply run `docker compose up` to spin up a local mongo db database along with the web server. After it starts up, navitage to localhost:4242 to view the web server.

By default, the Dockerfile includes additional plugins. Should you want to add/remove any plugins, you will need to modify the Entrypoint command. Simply uncomment the `entrypoint` section of the docker compose to specify what plugins you would like to include, or exlude

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


## ReST API

The MAGE ReSTful API is documented using [OpenAPI](https://swagger.io/specification/).  A MAGE server instance includes
a [Swagger UI](https://swagger.io/tools/swagger-ui/) page that renders a web app from the MAGE [OpenAPI document](service/src/docs/openapi.yaml).
The Swagger UI page is handy for testing the ReST API operations individually.  The _About_ page in the MAGE web app has
a link to the Swagger UI.  After logging in to the web app, the Swagger UI will automatically use the authentication
token from your login to authenticate ReST API requests.  Be mindful that the SwaggerUI is interacting with your
server's data, so use caution when trying POST/PUT/DELETE operations that mutate data.

### Code generation

You can use the MAGE server's OpenAPI document to generate an HTTP client that can consume the API.  Swagger and many other tools exist to generate client stubs based on OpenAPI.  [OpenAPI.Tools](https://openapi.tools/) is a good place to start.

### Android & iOS client apps

The MAGE team develops [Android](https://github.com/ngageoint/mage-android) and [iOS](https://github.com/ngageoint/mage-ios)
apps that interact with the ReST API.  The apps are open source and available under the Apache License for anyone to
use.  Check them out if you are considering mobile capabilities.

## Pull requests

If you'd like to contribute to this project, please make a pull request. We'll review the pull request and discuss the changes. All pull
request contributions to this project will be released under the [Apache license](#license).

Software source code previously released under an open source license and then modified by NGA staff is considered a "joint work"
(see 17 USC § 101); it is partially copyrighted, partially public domain, and as a whole is protected by the copyrights of the
non-government authors and must be released according to the terms of the original open source license.

## License

Copyright 2015 BIT Systems

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
