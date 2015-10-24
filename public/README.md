## MAGE Web Application

The MAGE web application is built with [AngularJS](https://angularjs.org/).

### Installing dependencies

MAGE dependencies are managed using [Bower](http://bower.io/).  Although the package.json file has a postinstall section that will install all bower dependencies when you run npm install at the root of the MAGE project, you can also install bower dependencies seperatly.

To install bower dependencies run:
```bash
$ cd public
$ bower install
```

### Running MAGE Web in Production

Once you fire up your node server you are all set to start using MAGE Web.  However you will be running with non minified, non uglified code, which means page loads within the web application could be slow.

To concat, minify and uglify css and JavaScript for MAGE web we are using [Grunt](http://gruntjs.com/).  The main grunt script is located in the root MAGE directory (not the public directory).  The sole reason for this is to be able to run the grunt script on npm installs postinstall step.  Grunt will only look for the Gruntfile.js file in the working directory that the task is run in.

To concat, minify and uglify css (from MAGE root directory):
```bash
$ grunt build
```

This will build a dist folder containing all minified and uglified resources, along with all other public resources.  The use this folder simply set the NODE_ENV environment variable to 'production':

```bash
export NODE_ENV=production
```
