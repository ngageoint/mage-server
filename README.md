## MAGE Web/Server

The Mobile Awareness GEOINT Environment, or MAGE, provides mobile situational awareness capabilities. The MAGE web app can be accessed over the internet and is optimized for desktop and mobile browsers.  The MAGE web app allows you to create geotagged field reports that contain media such as photos, videos, and voice recordings and share them instantly with who you want. Using the HTML Geolocation API, MAGE can also track users locations in real time. Your locations can be automatically shared with the other members of your team.

MAGE is very customizable and can be tailored for you situation, such as custom forms, avatars and icons.

MAGE Web/Server was developed at the National Geospatial-Intelligence Agency (NGA) in collaboration with BIT Systems. The government has "unlimited rights" and is releasing this software to increase the impact of government investments by providing developers with the opportunity to take things in new directions. The software use, modification, and distribution rights are stipulated within the Apache license.

This is the MAGE server supports [MAGE Android](https://github.com/ngageoint/mage-android) and [MAGE iOS](https://github.com/ngageoint/mage-ios).

## Architecture

MAGE is built using the MEAN stack.  The components of the MEAN stack are as follows:
* [MongoDB](https://www.mongodb.com/), a NoSQL database;
* [Express.js](http://expressjs.com/), a web applications framework;
* [Angular JS](https://angularjs.org/), a JavaScript MVC framework for web apps;
* [Node.js](https://nodejs.org/), a software platform for scalable server-side and networking applications.

## API & Documentation

The MAGE RESTful API is documented using [Swagger](http://swagger.io/). MAGE swagger API docs are servered out from /api/api-docs.

If you want to explore the interactive documentation there is a link from the About page.  Your API token is automatically inserted into interactive docs.  Have fun and remember that the documentation is hitting the server's API, so be careful with modifing requests such as POST/PUT/DELETE.

Want to use the API to build your own client?  Swagger has many tools to generate method stubs based on the api.  [Swagger Codegen](https://github.com/swagger-api/swagger-codegen/blob/master/README.md) is a good place to start.

Thinking about your own iOS or Android application based on the MAGE API.  We have an [Android SDK](https://github.com/ngageoint/mage-android-sdk) and [iOS SDK](https://github.com/ngageoint/mage-ios-sdk) project built around the MAGE API.

## Setup and installation
Currently MAGE runs on most linux flavors such as OSX, CentOS and Ubuntu.  Windows is not currently supported, but with a little work (mainly paths) and testing this is possible.

MAGE requires the following software:
* Node.js >= 0.10.0
* MongoDB >= 2.6.0
* Apache >= 2.2.15
* GraphicsMagick (optional, used for image rotation) >= 1.3

### Node.js setup
Install Node.js using your favorite package manager.

#### OSX example w/ homebrew
```bash
$ brew install node
$ node --version
```

#### CentOS example w/ yum
```bash
$ yum install nodejs npm --enablerepo=epel
$ node --version
```

### MongoDB setup
Install MongoDB using your favorite package manager.

#### OSX install w/ homebrew
```bash
$ brew install mongo
$ mongo --version
```

#### CentOS install w/ yum
Configure mongo yum repository

```bash
$ vi /etc/yum.repos.d/10gen-mongodb.repo
```
With contents:

```bash
[mongodb-org-3.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/$releasever/mongodb-org/3.0/x86_64/
gpgcheck=0
enabled=1
```

Verify install:
```bash
$ mongo --version
```

For more information check out the mongo CentOS/RHEL install page <https://docs.mongodb.org/manual/tutorial/install-mongodb-on-red-hat/>

### GraphicsMagick setup
GraphicsMagick is used to rotate and thumbnail images.  This is optional but recommended. Non-rotated images do not always orient correctly on many web browsers. In addition the mobile clients will request smaller images (thumbnails) based on screen resolution which greatly speeds up image download times.

#### GraphicsMagick install w/ homebrew

```bash
$ yum install GraphicMagick
$ gm version
```

#### GraphicsMagick install w/ yum

```bash
$ yum install GraphicMagick
$ gm version
```

## Running MAGE

### Install dependencies

You can install all MAGE (server and web) dependencies by using npm:
```bash
$ npm install
```

NPM install will install all node (server) dependencies in the node_modules folder.  There is a postinstall section in the package.json file that will also install all bower (web) dependencies to the bower_components directory.

### Configure MAGE

MAGE configuration lies within the config.json file located at the servers root directory.

Configuration:
* api - configuration parsed by clients for information about this MAGE server, exposed in /api call
    * name - Human readable MAGE server name
    * version - Used by MAGE clients to determine compatibility
        * major - Major server version. Updated when backwards breaking changes are implemented.
        * minor - Minor server version. Updated when significant feature changes are added that do not break backwards compatibility.
        * micro - Micro server version. Updated for bug fixes.
    * authenticationStrategies - hash of all authentication strategies accepted by this server.
        * local - local (username/p***REMOVED***word) authentication.  Usernames and p***REMOVED***words stored and managed localy by this MAGE server
            * p***REMOVED***wordMinLength - minimum p***REMOVED***word length
        * google - google oauth2 authentication strategy.
            * callbackURL - google callback URL
            * clientID - google client ID
            * clientSecret - google client ***REMOVED***
    * provison - device provisioning strategy
        * strategy - provision strategy name.  Provisioning strategy name maps to file name in provisioning directory
    * locationServices - turn on/off location ***REMOVED***s
* server - Server based configuration.  Not exposed to client
    * userBaseDirectory - root directory in which to store user avatar media
    * iconBaseDirectory - root directory in which to store user map icon media
    * token - client token information.  MAGE api is token based, upon authentication users will be issued a token.  Token must be present in all subsequent api requests.
        * expiration - token expiration in seconds.  Time at which token will expire.
    * locationServices
        * enabled - flag to turn on/off location ***REMOVED***s
        * userCollectionLocationLimit - user locations are stored in 2 different collections.  This is the limit for the capped locations.
    * attachment
        * baseDirectory - root directory in which to store attachment media, i.e. images, videos and voice
    * mongodb
        * host - host in which mongodb is running
        * port - port in which mongodb is running
        * db - mongodb database name in which to store MAGE data
        * poolSize - mongodb connection pool size for this plugin

```json
{
  "api": {
    "name": "MAGE (Mobile Awareness GEOINT Environment)",
    "version": {
      "major": 4,
      "minor": 0,
      "micro": 0
    },
    "authenticationStrategies": {
      "local": {
        "p***REMOVED***wordMinLength": 14
      },
      "google": {
        "callbackURL": " ",
        "clientID": " ",
        "clientSecret": " "
      }
    },
    "provision": {
      "strategy": "uid"
    },
    "locationServices": true
  },
  "server": {
    "userBaseDirectory": "/var/lib/mage/users",
    "iconBaseDirectory": "/var/lib/mage/icons",
    "token": {
      "expiration": 28800
    },
    "locationServices": {
      "enabled": true,
      "userCollectionLocationLimit": 100
    },
    "attachment": {
      "baseDirectory": "/var/lib/mage/attachments"
    },
    "mongodb": {
      "host": "localhost",
      "port": 27017,
      "db": "magedb",
      "poolSize": 5
    }
  }
}
```

### Starting Mongodb
To start mongo type the following:
```bash
$ mongod -f <configuration_file>
```

Your configuation file will live in a different place depending on how you installed mongodb.

homebrew: /usr/local/etc/mongod.conf
yum: /etc/mongod.conf

Feel free to play with the settings in the configuation file, but know that MAGE will run with the provided defaults.

### Initial Database setup

The  migration patches live in the migrations folders.  MAGE uses [mongodb-migrations](https://github.com/emirotin/mongodb-migrations) to support applying migrations.  On intial setup you will have to run the migrations to create the initial user and device used to log into the web.

To run the migrations:
``` bash
$ ./node_modules/.bin/mm
```

The /etc/mongod.conf file can be modified for your particular deployment as you see fit.  For starters, the provided defaults will get you up and running.

### Running the server

At this point you should be able to fire up your MAGE node server
```bash
$ node app.js
```

By default the node server runs on port 4242.  You can hit that port directly in a browser [MAGE local] (http://localhost:4242)

### Running With Forever

The best way to handle critical errors in NodeJS is to let the node server crash immediately.  Upon crash the server should be restarted.  There are many tools to monitor your node process to ensure its running.  We are currently using a simple node script called [forever](https://github.com/foreverjs/forever) to accomplish this.

We will use npm (Node Package Manager) to install forever. The -g option will install globally in the /usr/bin directory.
```bash
$ npm install -g forever
```

To start forever run:
```bash
$ forever start app.js
```

For a full list of forever commands please refer to the [forever docs](https://github.com/foreverjs/forever/blob/master/README.md)

## Plugins

MAGE plugins are seperate node scripts located in the plugins folder.  For more information about MAGE plugins please see the [MAGE Plugins README](plugins/README.md)

## Web application

The MAGE web application is built using AngularJS.  The application resides in the public directory, for more information about the [MAGE Web Application](public/README.md).

## Pull Requests

If you'd like to contribute to this project, please make a pull request. We'll review the pull request and discuss the changes. All pull request contributions to this project will be released under the Apache license.

Software source code previously released under an open source license and then modified by NGA staff is considered a "joint work" (see 17 USC § 101); it is partially copyrighted, partially public domain, and as a whole is protected by the copyrights of the non-government authors and must be released according to the terms of the original open source license.

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
