MAGE Web/Server

10/23/2015

This is the MAGE server and web client.  Supports [MAGE Android](https://github.com/ngageoint/mage-android) and [MAGE iOS](https://github.com/ngageoint/mage-ios).

## About

The Mobile Awareness GEOINT Environment, or MAGE, provides mobile situational awareness capabilities. The MAGE web app can be accessed over the internet and is optimized for desktop and mobile browsers.  The MAGE web app allows you to create geotagged field reports that contain media such as photos, videos, and voice recordings and share them instantly with who you want. Using the HTML Geolocation API, MAGE can also track users locations in real time. Your locations can be automatically shared with the other members of your team.

MAGE is very customizable and can be tailored for you situation, such as custom forms, avatars and icons.

MAGE Web/Server was developed at the National Geospatial-Intelligence Agency (NGA) in collaboration with BIT Systems. The government has "unlimited rights" and is releasing this software to increase the impact of government investments by providing developers with the opportunity to take things in new directions. The software use, modification, and distribution rights are stipulated within the Apache license.

## Architecture

MAGE is built using the MEAN stack.  The components of the MEAN stack are as follows:
* [MongoDB](https://www.mongodb.com/), a NoSQL database;
* [Express.js](http://expressjs.com/), a web applications framework;
* [Angular JS](https://angularjs.org/), a JavaScript MVC framework for web apps;
* [Node.js](https://nodejs.org/), a software platform for scalable server-side and networking applications.

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
<pre>
[mongodb-org-3.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/$releasever/mongodb-org/3.0/x86_64/
gpgcheck=0
enabled=1
</pre>

Verify install:
```bash
$ mongo --version
```

For more information check out the mongo CentOS/RHEL install page <https://docs.mongodb.org/manual/tutorial/install-mongodb-on-red-hat/>

### GraphicsMagick setup (optional)
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
