
'use strict';

const async = require('async')
    , log = require('winston')
    , fs = require('fs')
    , exportDirectory = require('../../environment/env').exportDirectory;

function sweep() {
    log.info('export-file-sweeper: Sweeping ' + exportDirectory);

    const files = fs.readdirSync(exportDirectory);

    async.eachSeries(files, function (file, done) {
        log.info('export-file-sweeper: Checking export file ' + file);
        //TODO implement
        done();
    }, function (err) {
        if (err) {
            log.error('export-file-sweeper: Error sweeping ' + exportDirectory, err);
        }
    });
}

exports.initialize = function (app, done) {
    log.info('export-file-sweeper: Initializing job to check ' + exportDirectory + ' for expired export files.');

    //TODO use config value
    setInterval(sweep, 5000);

    done();
};