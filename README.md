# MAGE Web Service & Web App

The **M**obile **A**wareness **G**EOINT **E**nvironment, or [MAGE](https://ngageoint.github.io/MAGE) platform, provides
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
requires Node >= 14.x.

### Install MongoDB

Before running a MAGE server, you'll need to install and start [MongoDB](https://www.mongodb.com/try/download/community).
At the time of this writing, MAGE supports MongoDB version 4.x.

### Install MAGE server packages

Starting with release [6.2.0](https://github.com/ngageoint/mage-server/releases/tag/6.2.0), MAGE server [releases](https://github.com/ngageoint/mage-server/releases) publish NPM package tarballs.  To install and run MAGE, download the tarball artifacts from the desired
release to an empty directory, such as `mage-server`, and install them with NPM.
```bash
npm install --omit dev \
ngageoint-mage.service-*.tgz \
ngageoint-mage.web-app-*.tgz \
ngageoint-mage.image.service-*.tgz \
ngageoint-mage.nga-msi-*.tgz
```
That will yield a `package.json` file that looks something like
```json
{
  "dependencies": {
    "@ngageoint/mage.image.service": "file:ngageoint-mage.image.service-1.0.0.tgz",
    "@ngageoint/mage.nga-msi": "file:ngageoint-mage.nga-msi-1.0.1.tgz",
    "@ngageoint/mage.service": "file:ngageoint-mage.service-6.2.0.tgz",
    "@ngageoint/mage.web-app": "file:ngageoint-mage.web-app-6.2.0.tgz"
  }
}
```
as well as a `package-lock.json` file and `node_modules` directory containing all of the MAGE server's dependencies.

### Run `mage.service` script

The `@ngageoint/mage.service` package includes a [`mage.service` [bin script](https://docs.npmjs.com/cli/v8/configuring-npm/package-json#bin) for starting
the server process.  From the `instance` directory, you can run `npx @ngageoint/mage.service --help` to see the configuration
options.

On Windows Server installations, running the command: `node node_modules\@ngageoint\mage.service\bin\mage.service.js` in the `instance` directory, will initialize the `mage.service` script.

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
[http://localhost:4242](http://localhost:4242) if you are running MAGE locally.

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

Upgrading the MAGE server essentially consists of the same process as [installing for the first time](#install-mage-server-release-packages).
1. As above, download the package tarballs for the desired version.
2. Stop your current MAGE server if it is running.
3. *_[BACK UP YOUR DATABASE](https://docs.mongodb.com/manual/core/backups/)!_* (You already do that regularly, right?)
5. Start your new MAGE server, which will automatically run any database [migrations](#mage-database-setup) present in
   the new version.

## Building from source

First, clone the MAGE server GitHub repository, or download a release source tarball and extract the contents to an
empty directory, such as `mage-server`.  The project has a monorepo structure.  The main packages to build are [`@ngageoint/mage.service`](./service/)
and [`@ngageoint/mage.web-app`](./web-app/).  There are more optional packages in the [`plugins`](./plugins/)
directory.  The [`instance`](./instance/) package is an example of assembling all the packages into a running MAGE
server instance.

First, build the `service` package.
```bash
cd service
npm ci
npm run build
```
Then build the `web-app` package.
```bash
cd web-app
npm ci
npm run build
```
Build optional plugin packages similarly.:
```bash
cd plugins/nga-msi
npm ci
npm run build
```
After building the core packages, install them as dependencies in the `instance` package.
```bash
cd instance
npm i --omit dev ../service ../web-app ../plugins/nga-msi
```
The project's root [`package.json`](./package.json) provides some convenience script entries to install, build, and run
the MAGE server components, however, those are deprecated and will likely go away after migrating to NPM 7+'s
[workspaces](https://docs.npmjs.com/cli/v8/using-npm/workspaces) feature.

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
