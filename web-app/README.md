# MAGE Web Application

The MAGE web client is a hybrid app built on [AngularJS](https://angularjs.org/) and [Angular](https://angular.io/).

## Building

The MAGE web client uses [npm](https://www.npmjs.com/) and [Angular CLI](https://cli.angular.io/) to manage dependencies and bundle assets.
From the `mage root` directory
```bash
$ npm run build-web
```

## Running MAGE web client

For the web client to be useful, you'll want to [start a local MAGE server](../README.md#running-the-server).

### Debug build

From the `mage root` directory
```bash
$ npm run start-web
```
This command uses Angular CLI to start a server running on http://localhost:4200.  That 
configuration also proxies all requests for `/api` to the local MAGE server, which the configuration assumes is bound to
http://localhost:4242.  This debug Angular CLI server will watch and hot-load any changes to the resources in the `web-app` 
directory, and apply source maps so you can inspect the content in your browser's development console.

### Production build

The `npm run build-web` command you ran earlier uses Angular CLI to minify, obfuscate, and bundle 
all of the MAGE web app's JavaScript and CSS assets into the `dist` directory.  The MAGE server [Express](../express.js) 
configuration will serve the assets from that directory.  You can also potentially serve the contents of that directory 
from a separate reverse proxy server, such as nginx or Apache httpd, as they are just static web resources.

