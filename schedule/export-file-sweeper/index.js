
'use strict';

const log = require('winston')
    , fs = require('fs')
    , exportDirectory = require('../../environment/env').exportDirectory;

function sweep() {
    log.info('export-file-sweeper: Sweeping ' + exportDirectory);

    //TODO implement
}

exports.initialize = function (app, done) {
    log.info('export-file-sweeper: Initializing job to check ' + exportDirectory + ' for expired export files.');

    setInterval(sweep, 5000);

    done();
};