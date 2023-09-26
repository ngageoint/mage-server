#!/usr/bin/env node

/**
 * This small script simply creates an NPM package with no dependencies.  While
 * Angular CLI needs the dependencies to properly build the app, the compiled
 * product is completely self-contained.  When MAGE pulls the web app package
 * via npm install, there is no need to install all the web app dependencies,
 * only the compiled bundle that MAGE serves to the web browser.
 */
const fs = require('fs-extra');
const path = require('path');
const process = require('process');

const post = builderOptions => {
  const packageDesc = require('./package');
  delete packageDesc.private;
  delete packageDesc.scripts;
  delete packageDesc.dependencies;
  delete packageDesc.devDependencies;
  delete packageDesc.main;
  delete packageDesc.files;
  packageDesc.peerDependencies = {
    '@ngageoint/mage.service': `^${packageDesc.version}`
  };
  const outputPathDir = path.resolve(process.cwd(), builderOptions.outputPath);
  const packageDescPath = path.join(outputPathDir, 'package.json');
  fs.writeFileSync(packageDescPath, JSON.stringify(packageDesc, null, 2));
}

module.exports.default = { post }
