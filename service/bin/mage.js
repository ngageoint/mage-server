#!/usr/bin/env node

const { Command, Option, InvalidArgumentError } = require('commander');
const fsx = require('fs-extra')
const { boot } = require('../lib/app');
const magePackage = require('../package.json');

/*
TODO: collect environment variables using commander options here as well,
allowing to them to be overridden with command line args.  remove all instances
in service code that directly reference the `environment/env` module
*/

const mage = new Command('mage');
mage.version(magePackage.version);

const optPluginsDesc =
  `A JSON document or path to a JSON file in the form
  ${JSON.stringify({
    servicePlugins: [
      '@my/mage-service-plugin-module'
    ],
    webUIPlugins: [
      '@my/mage-web-ui-plugin-module'
    ]
  }, null, 2).replace(/\n/g, '\n  ')}

`
const optPlugins = new Option('--plugins <plugins_descriptor>', optPluginsDesc).env('MAGE_PLUGINS').argParser(parsePluginsJsonFromStringOrFile);

mage.addOption(optPlugins);

mage.option('-p --plugin <module_name...>');

mage.option('-w --web-plugin <module_name...>');

const opts = mage.parseAsync().then(
  async mage => {
    const opts = mage.opts();
    const pluginsConfig = mergePluginsOpts(opts);
    console.log(pluginsConfig);
    boot(pluginsConfig).then(service => {
      service.open();
    });
  },
  err => {
    console.error(err);
    process.exit(1);
  }
);

function mergePluginsOpts(opts) {
  const plugins = opts.plugins || {}
  const servicePlugins = (opts.plugin || []).concat(plugins.servicePlugins || [])
  const webUIPlugins = (opts.webPlugin || []).concat(plugins.webUIPlugins || [])
  return { servicePlugins, webUIPlugins }
}

function parsePluginsJsonFromStringOrFile(jsonOrPath) {
  let plugins = null;
  try {
    plugins = JSON.parse(jsonOrPath);
  }
  catch (err) { }
  if (!plugins) {
    try {
      plugins = fsx.readJSONSync(jsonOrPath);
    }
    catch (err) {
      console.error(err);
      throw new InvalidArgumentError(`failed to parse JSON file from path ${jsonOrPath}`);
    }
  }
  if (!plugins || typeof plugins !== 'object') {
    throw new InvalidArgumentError('plugins must be a JSON object');
  }
  if (plugins.servicePlugins && !Array.isArray(plugins.servicePlugins)) {
    throw new InvalidArgumentError('plugins JSON key servicePlugins must be an array of strings')
  }
  if (plugins.webUIPlugins && !Array.isArray(plugins.webUIPlugins)) {
    throw new InvalidArgumentError('plugins JSON key webUIPlugins must an array of strings')
  }
  return plugins;
}
