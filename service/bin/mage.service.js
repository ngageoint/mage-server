#!/usr/bin/env node

const { Command, Option, InvalidArgumentError } = require('commander');
const path = require('path');
const _ = require('lodash');
const magePackage = require('../package.json');

const mageCmd = new Command('mage');
mageCmd.version(magePackage.version);

const optConfigDesc =
  `A JSON document or path to a JSON file or path to a Node module whose export is a MAGE configuration object, e.g.,
  ${JSON.stringify({
    mage: {
      address: '0.0.0.0',
      port: 4242,
      attachmentDir: '/mage/data/attachments',
      mongo: {
        poolSize: 2
      }
    }
  }, null, 2).replace(/\n/g, '\n  ')}

Further individual command line parameters will override those in the configuration document.
`;

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

`;

const options = [
  new Option('-C --config <string>', optConfigDesc).env('MAGE_CONFIG').argParser(parseConfigJsonFromStringOrFile),
  new Option('-a --address <string>', 'The address on which the web server listens for HTTP requests').env('MAGE_ADDRESS').default('0.0.0.0'),
  new Option('-p --port <number>', 'The port on which which the web server listens for HTTP requests').env('MAGE_PORT').default(4242).argParser(x => parseInt(x)),
  new Option('--attachment-dir <string>').env('MAGE_ATTACHMENT_DIR').default('/var/lib/mage/attachments'),
  new Option('--export-dir <string>').env('MAGE_EXPORT_DIR').default('/var/lib/mage/export'),
  new Option('--icon-dir <string>').env('MAGE_ICON_DIR').default('/var/lib/mage/icons'),
  new Option('--layer-dir <string>').env('MAGE_LAYER_DIR').default('/var/lib/mage/layers'),
  new Option('--security-dir <string>').env('MAGE_SECURITY_DIR').default('/var/lib/mage/security'),
  new Option('--temp-dir <string>').env('MAGE_TEMP_DIR').default('/tmp'),
  new Option('--user-dir <string>').env('MAGE_USER_DIR').default('/var/lib/mage/users'),
  new Option('--export-sweep-interval <number>').env('MAGE_EXPORT_SWEEP_INTERVAL').default(28800, '8 hours').argParser(x => parseInt(x)),
  new Option('--export-ttl <number>').env('MAGE_EXPORT_TTL').default(259200, '72 hours').argParser(x => parseInt(x)),
  new Option('--token-expiration <number>').env('MAGE_TOKEN_EXPIRATION').default(28800, '8 hours').argParser(x => parseInt(x)),
  new Option('--mongo.url <string>', 'The URL to the MongoDB database, e.g., mongodb://127.0.0.1/mage').env('MAGE_MONGO_URL').default('mongodb://127.0.0.1:27017/magedb'),
  new Option('--mongo.conn-timeout <string>').env('MAGE_MONGO_CONN_TIMEOUT').default(300, '300 seconds').argParser(x => parseInt(x)),
  new Option('--mongo.conn-retry-delay <string>').env('MAGE_MONGO_CONN_RETRY_DELAY').default(5, '5 seconds').argParser(x => parseInt(x)),
  new Option('--mongo.pool-size <string>').env('MAGE_MONGO_POOL_SIZE').default(5).argParser(x => parseInt(x)),
  new Option('--mongo.user <string>').env('MAGE_MONGO_USER'),
  new Option('--mongo.password <string>').env('MAGE_MONGO_PASSWORD'),
  new Option('--mongo.ssl [string]').env('MAGE_MONGO_SSL').default(false),
  new Option('--mongo.replica-set <string>').env('MAGE_MONGO_REPLICA_SET'),
  new Option('--mongo.x509-key <string>').env('MAGE_MONGO_X509_KEY'),
  new Option('--mongo.x509-key-file <string>').env('MAGE_MONGO_X509_KEY_FILE'),
  new Option('--mongo.x509-cert <string>').env('MAGE_MONGO_X509_CERT'),
  new Option('--mongo.x509-cert-file <string>').env('MAGE_MONGO_X509_CERT_FILE'),
  new Option('--mongo.x509-ca-cert <string>').env('MAGE_MONGO_X509_CA_CERT'),
  new Option('--mongo.x509-ca-cert-file <string>').env('MAGE_MONGO_X509_CA_CERT_FILE'),
  new Option('-P --plugins <string>', optPluginsDesc).env('MAGE_PLUGINS').argParser(parsePluginsJsonFromStringOrModule),
  new Option('--plugin <module_name...>'),
  new Option('--web-plugin <module_name...>'),
  new Option('--show-config', 'Print the effective configuration and exit without starting the server')
]

options.forEach(x => mageCmd.addOption(x))

mageCmd.parseAsync().then(
  async mageCmd => {
    const opts = mageCmd.opts();
    const merged = mergeOptsToConfig(opts);
    tempEnvHack(merged);
    if (merged.showConfig === true) {
      console.info(JSON.stringify(merged, null, 2));
      process.exit(0);
    }
    const { boot } = require('../lib/app');
    const service = await boot(merged);
    service.open();
  },
  err => {
    console.error(err);
    process.exit(1);
  }
);

const configKeyForOptKey = {
  exportTtl: 'exportTTL'
};

function mergeOptsToConfig(opts) {
  const config = opts.config ? opts.config.mage || {} : {};
  const manualMergeKeys = [ 'config', 'plugins', 'plugin', 'webPlugin' ];
  const optsSimple = _.omit(opts, manualMergeKeys);
  const DefaultValue = function(x) {
    this.value = x;
  };
  const optsDefaultsMarked = _.mapValues(optsSimple, (value, key) => {
    const optionDef = options.find(x => x.attributeName() === key);
    if (optionDef.defaultValue && optionDef.defaultValue === value) {
      return new DefaultValue(value);
    }
    return value;
  });
  const optsWithConfigKeys = _.mapKeys(optsDefaultsMarked, (v, k) => configKeyForOptKey[k] || k);
  const optsNested = Object.entries(optsWithConfigKeys).reduce((optsNested, entry) => {
    if (manualMergeKeys[entry[0]]) {
      return optsNested;
    }
    const nestedEntry = dotsToNested(entry);
    return _.merge(optsNested, nestedEntry);
  }, {});
  const overriddenDefaults = _.mergeWith({}, config, optsNested, (configValue, optValue, key) => {
    if (!optValue) {
      return configValue;
    }
    if (typeof configValue === 'object') {
      // nested object - continue recursive merge
      return void(0);
    }
    if (!configValue) {
      return optValue instanceof DefaultValue ? optValue.value : void(0);
    }
    if (optValue instanceof DefaultValue) {
      return configValue;
    }
    if (typeof optValue === 'object') {
      // nested object - continue recursive merge
      return void(0);
    }
    return optValue;
  });
  const plugins = mergePlugins(opts, config);
  return { ...overriddenDefaults, plugins };
}

function dotsToNested(entry) {
  const steps = entry[0].split('.');
  const nested = steps.slice(0, -1).reduceRight((nested, key) => {
    return { [key]: nested };
  }, { [steps.slice(-1)]: entry[1] });
  return nested;
}

function mergePlugins(opts, config) {
  const optsPlugins = opts.plugins || {};
  const configPlugins = config.plugins || {};
  const servicePlugins = (opts.plugin || []).concat(optsPlugins.servicePlugins || []).concat(configPlugins.servicePlugins || [])
  const webUIPlugins = (opts.webPlugin || []).concat(optsPlugins.webUIPlugins || []).concat(configPlugins.webUIPlugins || [])
  return { servicePlugins, webUIPlugins }
}

function parseConfigJsonFromStringOrFile(jsonOrPath) {
  const config = parseJsonFromStringOrModule(jsonOrPath);
  // TODO: validation
  return config;
}

function parsePluginsJsonFromStringOrModule(jsonOrPath) {
  const plugins = parseJsonFromStringOrModule(jsonOrPath);
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

function parseJsonFromStringOrModule(jsonOrModulePath) {
  let json = null;
  try {
    json = JSON.parse(jsonOrModulePath);
  }
  catch (err) { }
  if (!json) {
    try {
      const jsonPath = path.resolve(process.cwd(), jsonOrModulePath);
      json = require(jsonPath);
    }
    catch (err) {
      console.error(err);
      throw new InvalidArgumentError(`failed to parse JSON file from path ${jsonOrModulePath}`);
    }
  }
  return json;
}

/**
 * Populate `process.env` with key-value pairs using the environment variable
 * names associated with the keys in the given configuration object.  This
 * supports legacy code that accesses `process.env` directly, or through
 * MAGE's `environment/env` module and maintains the behavior of overriding
 * environment variables with command line parameters.
 * TODO: this will go away when we remove all direct env references
 * from downstream code, let commander handle the env vars, and pass
 * the configuration object to the mage app
 */
function tempEnvHack(config) {
  options.forEach(option => {
    const optKey = option.attributeName();
    const configKey = configKeyForOptKey[optKey] || optKey;
    const { envVar } = option;
    if (!envVar) {
      return;
    }
    const optVal = _.get(config, configKey);
    if (typeof optVal === 'object') {
      return;
    }
    if (process.env[envVar] && process.env[envVar] === String(optVal)) {
      return;
    }
    if (!optVal) {
      return;
    }
    process.env[envVar] = String(optVal);
  });
}