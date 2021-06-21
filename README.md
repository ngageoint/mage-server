Master [![Build Status Master Branch](https://travis-ci.org/ngageoint/mage-server.svg?branch=master)](https://travis-ci.org/ngageoint/mage-server/branches)
Develop [![Build Status Develop Branch](https://travis-ci.org/ngageoint/mage-server.svg?branch=develop)](https://travis-ci.org/ngageoint/mage-server/branches)

# MAGE server & Web client

The **M**obile **A**wareness **G**EOINT **E**nvironment, or MAGE, provides mobile situational awareness capabilities. The MAGE web client can be accessed over the internet and is optimized for desktop and mobile web browsers.  The MAGE web client allows you to create geotagged field reports that contain media such as photos, videos, and voice recordings and share them instantly with who you want. Using the HTML Geolocation API, MAGE can also track users locations in real time. Your locations can be automatically shared with the other members of your team.

MAGE is very customizable and can be tailored for your situation, including custom forms, avatars, and icons.

MAGE was developed at the National Geospatial-Intelligence Agency (NGA) in collaboration with BIT Systems. The government has "unlimited rights" and is releasing this software to increase the impact of government investments by providing developers with the opportunity to take things in new directions. The software use, modification, and distribution rights are stipulated within the Apache license.

The server supports the [MAGE Android](https://github.com/ngageoint/mage-android) and [MAGE iOS](https://github.com/ngageoint/mage-ios) mobile clients.

## Architecture

MAGE is built using the [MEAN stack](https://en.wikipedia.org/wiki/MEAN_(software_bundle)).  The components of the MEAN stack are as follows:
* [MongoDB](https://www.mongodb.com/), a NoSQL database;
* [Express.js](http://expressjs.com/), a web applications framework;
* [AngularJS](https://angularjs.org/), a JavaScript MVC framework for web apps;
* [Node.js](https://nodejs.org/), a software platform for scalable server-side and networking applications.

## API & documentation

The MAGE ReSTful API is documented using [OpenAPI](https://swagger.io/specification/).  MAGE [swagger API docs](docs/openapi.yaml) are served out from [*/api_docs*](http://localhost:4242/api_docs).

If you want to explore the interactive documentation there is a link from the About page in the MAGE web client.  Your API token is automatically inserted into interactive docs.  Have fun and remember that the documentation is hitting the server's API, so be careful trying POST/PUT/DELETE operations that modify data.

### Code generation

Want to use the API to build your own client?  Swagger and many other tools exist to generate client stubs based on the API.  [OpenAPI.Tools](https://openapi.tools/) is a good place to start.

#### Android & iOS

Opensource MAGE [Android](https://github.com/ngageoint/mage-android) and [iOS](https://github.com/ngageoint/mage-ios) clients are available under the Apache License for anyone to use.  Check them out if you are considering mobile platforms.

If you are considering building your own iOS or Android application based on the MAGE API, the [Android SDK](https://github.com/ngageoint/mage-android-sdk) and [iOS SDK](https://github.com/ngageoint/mage-ios-sdk) are already built and tested around the MAGE API.

## Setup infrastructure components

MAGE runs on most *nix operating systems, such as macOS, CentOS, and Ubuntu.  Although not currently supported, MAGE will run on Windows systems with some minor configuration (mainly paths) work.

MAGE depends the following software:
* [Node.js](https://nodejs.org/) >= 8
* [MongoDB](https://www.mongodb.org/) >= 3.0
* [Apache HTTP Server](https://httpd.apache.org/) >= 2.2.15
* [GraphicsMagick](http://www.graphicsmagick.org/) (optional, but recommended for image rotation and thumbnails) >= 1.3

### Node.js setup

#### Install [Node Version Manager](https://github.com/creationix/nvm)

This will make it simple to install a specific version of NodeJS as well as update to a newer version.
```bash
$ curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash
$ source ~/.bashrc
```

#### Install [Node.js](https://nodejs.org/) with Node Version Manager

```bash
$ nvm install --lts
$ node --version
```

### MongoDB setup

Install [MongoDB](https://docs.mongodb.com/manual/administration/install-community/) using your favorite package manager.

#### macOS install with homebrew

```bash
$ brew tap mongodb/brew
$ brew install mongodb-community@4.4
$ mongo --version
```

#### CentOS install with yum

Configure mongo yum repository with your favorite editor

```bash
$ vi /etc/yum.repos.d/mongodb-org-4.4.repo
```
With contents:

```bash
[mongodb-org-4.4]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/amazon/2/mongodb-org/4.4/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-4.4.asc
```

Install from newly created repo:

```bash
sudo yum install -y mongodb-org
```

Verify install:
```bash
$ mongo --version
```

#### Ubuntu install with apt

```bash
$ sudo apt-get install mongodb
$ mongo --version && mongod --version
```

For more information check out the mongo CentOS/RHEL install page <https://docs.mongodb.org/manual/tutorial/install-mongodb-on-red-hat/>

### GraphicsMagick setup

The optional, but recommended, [GraphicsMagick](http://www.graphicsmagick.org/) suite is used to rotate and thumbnail images on the MAGE server.  Many web browsers and mobile devices will not render rotated images based on their exif data.  By thumbnailing images, mobile clients can request smaller images, significantly increasing performance.

Install GraphicsMagick using your favorite package manager.

#### GraphicsMagick install with homebrew

```bash
$ brew install graphicsmagick
$ gm version
```

#### GraphicsMagick install with yum

```bash
$ yum install GraphicsMagick
$ gm version
```

#### Ubuntu install with apt

```bash
$ sudo apt-get install graphicsmagick
$ gm version
```

## Installing and running MAGE

You can install the MAGE server wherever you like. In this example we will install it in `/opt/mage`.

### Grab the latest [release](https://github.com/ngageoint/mage-server/releases)

```bash
$ mkdir /opt/mage
$ cd /opt/mage
$ curl https://codeload.github.com/ngageoint/mage-server/zip/<version> | tar -xf - -C .
```
or via Git
```bash
$ mkdir /opt/mage
$ cd /opt/mage
$ git clone https://github.com/ngageoint/mage-server.git /opt/mage
```

The rest of the installation steps assume you are in the `<MAGE_ROOT>` directory, .e.g. `/opt/mage`.

### Installing NPM dependencies

You can install all server dependencies by using npm from the `<MAGE_ROOT>` directory:
```bash
$ npm install
```

### MAGE local media directory

By default MAGE will store media attachments (video, images, etc), as well as user and map icons locally on the MAGE server.
The default base directory for these files is '/var/lib/mage', so you will need to create that.  If you would like to change
where MAGE stores these files, please see the relevant material in [MAGE Setup](#setting-up-mage-for-local-deployment).

``` bash
$ mkdir /var/lib/mage
```

### Starting MongoDB

To start the mongo daemon type the following:
```bash
$ mongod --config <filename>
```

The mongodb configuation file will live in a different place depending on your system:
* homebrew: `/usr/local/etc/mongod.conf`
* yum: `/etc/mongod.conf`
* apt: `/etc/mongodb.conf`

MAGE will run with the default MongoDB configuration, but feel free to modify these settings for your particular deployment.

### MAGE database setup

The database patches are Node.js modules in [`<MAGE_ROOT>/migrations`](migrations).  MAGE uses
[mongodb-migrations](https://github.com/emirotin/mongodb-migrations) to apply database migrations.  The MAGE server applies
the migrations present in the `migrations` directory automatically every time it starts.  The MAGE server will not accept
any client requests until all migrations are complete, so clients cannot modify the database while the server is migrating
the database.

If you need to run database migrations manually, you can type
```bash
$ npm run migrate
```
from `<MAGE_ROOT>`.  Most of the time this should not be necessary, but if you must, stopping your MAGE server would be a
good idea to avoid corrupting your database.

#### Custom migrations

You can add your own custom database migrations to the `migrations` directory.  Just make sure they conform to
[mongodb-migrations](https://github.com/emirotin/mongodb-migrations) requirements.  Be aware that mongodb-migrations
runs the migration scripts in lexical order of the script file names, so name your custom scripts accordingly.
Also consider that mongodb-migrations ensures that your migrations will only run once during the life of your database,
so you will need to continuously be sure that any custom migrations are compatible with migrations new releases may
introduce when you [upgrade](#upgrading-mage-server).

### MAGE environment settings

MAGE environment configuration is loaded from a Node module, [environment/env.js](environment/env.js).  That module reads
several environment variables to configure MAGE, and provides sensible defaults for any that are not present.  For
convenience, MAGE provides a [shell script](environment/magerc.sh) that exports all the MAGE environment variables.  You
can copy this script to a convenient, persistent location external to `<MAGE_ROOT>` on the machine that runs your MAGE
server Node process and `source` it to initialize the MAGE server enironment with your settings.  The home directory of
a user that runs the MAGE server Node process, or `/etc/mage` are good candidates.

### Running the server

At this point you should be able to fire up your MAGE node server
```bash
$ node app.js
```
If for some reason you've forgotten to [start MongoDB](#starting-mongodb), the MAGE server app will continue trying to
connect to the database until a [configured timeout](#mage-environment-settings) or a successful connection.

The node MAGE server runs on port 4242 by default.  You can access the MAGE web app in your web browser at
[localhost:4242](http://localhost:4242).

### Running with `forever`

The best way to handle critical errors in Node.js is to let the node server crash immediately.  Upon crash the server
should be restarted.  There are many tools to monitor your node process to ensure its running.  We are currently using
a simple node script called [forever](https://github.com/foreverjs/forever) to accomplish this.

Use npm (Node Package Manager) to install forever. The `-g` option will install globally in the `/usr/bin` directory.
```bash
$ npm install -g forever
```
To start forever run:
```bash
$ forever start app.js
```

For a full list of forever commands please refer to the [forever docs](https://github.com/foreverjs/forever/blob/master/README.md).

### Running with [Docker](https://www.docker.com/what-docker)

Refer to the [Docker README](docker/README.md) for details on running the MAGE server using Docker.

#### Cloud Foundry deployment

MAGE uses the [cfenv](https://github.com/cloudfoundry-community/node-cfenv) Node module to read settings from Cloud Foundry's
[environment variables](https://docs.cloudfoundry.org/devguide/deploy-apps/environment-variable.html).  If Cloud Foundry's
environment variables are present, they will take precendence over any of their counterparts derived from the
[magerc.sh](environment/env.js) file.  This pertains mostly to defining the connection to the MongoDB server as a bound service
in Cloud Foundry, for which Cloud Foundry should supply the connection string and credentials in the `VCAP_SERVICES` value.

### Configuring and customizing MAGE

MAGE configuration lies within the config.js file located at the server's root directory.

Configuration:
* api - configuration parsed by clients for information about this MAGE server, exposed in /api call
    * name - Human readable MAGE server name
    * version - Used by MAGE clients to determine compatibility
        * major - Major server version. Updated when backwards breaking changes are implemented.
        * minor - Minor server version. Updated when significant feature changes are added that do not break backwards compatibility.
        * micro - Micro server version. Updated for bug fixes.
    * provison - device provisioning strategy
        * strategy - provision strategy name.  Provisioning strategy name maps to file name in provisioning directory
* server - Server based configuration.  Not exposed to client
    * locationServices
        * userCollectionLocationLimit - user locations are stored in 2 different collections.  This is the limit for the capped locations.

```json
{
  "api": {
    "name": "MAGE (Mobile Awareness GEOINT Environment)",
    "version": {
      "major": 5,
      "minor": 0,
      "micro": 0
    },
    "provision": {
      "strategy": "uid"
    }
  },
  "server": {
    "locationServices": {
      "userCollectionLocationLimit": 100
    }
  }
}
```

### Upgrading MAGE server

Upgrading the MAGE server essentially consists of the same process as [installing for the first time](#installing-and-running-mage).
1. As above, download (or `git pull`) the latest release and extract it.
2. Stop your current MAGE server if it is running.
3. *_[BACK UP YOUR DATABASE](https://docs.mongodb.com/manual/core/backups/)!!!_* (You already do that regularly, right?)
4. Copy any [configuration](#configuring-and-customizing-mage) mods to your new MAGE installation.
5. Start your new MAGE server, which will run any new database [migrations](#mage-database-setup) present in the new baseline.

## Plugins

MAGE plugins are separate node scripts located in the plugins folder.  For more information about MAGE plugins please see the
[MAGE Plugins README](plugins/README.md).

## Web application

Refer to the [Web Application README](web-app/README.md) for details on building and running the MAGE web application.

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
