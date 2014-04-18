var mongoose = require('mongoose')
  , path = require("path")
  , fs = require('fs-extra')
  , config = require('./config.json');

var optimist = require("optimist")
  .usage("Usage: $0 --type [string] --timeout [number] --key [string]")
  .describe('type', 'Run type, allowed values are [data, attachments]')
  .demand('type')
  .demand('key');

var argv = optimist.argv;
if (argv.h || argv.help) return optimist.showHelp();

// Use same directory for media attachments as MAGE
var attachmentBase = config.server.attachment.baseDirectory;

// Configuration of the MAGE Express server
var mongodbConfig = config.server.mongodb;
mongoose.connect(mongodbConfig.url, {server: {poolSize: mongodbConfig.poolSize}}, function(err) {
  if (err) {
    console.log('Error connecting to mongo database, please make sure mongodbConfig is running...');
    throw err;
  }
});
mongoose.set('debug', true);

// Configure RAGE
require('./rage/index')({
  key: argv.key,
  type: argv.type,
  attachmentBase: attachmentBase,
  // baseUrl: 'http://localhost:4242'
  baseUrl: 'https://magepdc.geointapps.org'
});
