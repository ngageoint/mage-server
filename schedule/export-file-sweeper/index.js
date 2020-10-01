
'use strict';

const log = require('winston')
  , fs = require('fs')
  , exportDirectory = require('../../environment/env').exportDirectory;

exports.initialize = function(app, done) {
    log.info('export-file-sweeper: Initializing job to check ' + exportDirectory + ' for expired export files.')
    done();
};