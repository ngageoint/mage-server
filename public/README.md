# MAGE Web Application

The MAGE web client is built on [AngularJS](https://angularjs.org/).

## Building

The MAGE web client uses [npm](https://www.npmjs.com/) and [webpack](https://webpack.js.org/) to manage dependencies and bundle assets.
From the MAGE base directory, run
```bash
$ npm run build
```
or from the `public` directory
```bash
$ npm install
$ npm run build
```

## Running MAGE web client

For the web client to be useful, you'll want to [start a local MAGE server](../README.md#running-the-server).

### Debug build

From the `public` directory run
```bash
$ npm run start
```
This command uses the [development](webpack.dev.js) webpack config to start a server running on http://localhost:3000.  That 
configuration also proxies all requests for `/api` to the local MAGE server, which the configuration assumes is bound to
http://localhost:4242.  This debug webpack server will watch and hot-load any changes to the resources in the `public` 
directory, and apply source maps so you can inspect the content in your browser's development console.

### Production build

The `npm run build` command you ran earlier uses the webpack [production](webpack.prod.js) to minify, obfuscate, and bundle 
all of the MAGE web app's JavaScript and CSS assets into the `dist` directory.  The MAGE server [Express](../express.js) 
configuration will serve the assets from that directory.  You can also potentially serve the contents of that directory 
from a separate reverse proxy server, such as nginx or Apache httpd, as they are just static web resources.

