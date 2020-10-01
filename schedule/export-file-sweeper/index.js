
'use strict';

const async = require('async')
    , log = require('winston')
    , fs = require('fs')
    , path = require('path')
    , exportDirectory = require('../../environment/env').exportDirectory;

function sweep() {
    log.info('export-file-sweeper: Sweeping directory ' + exportDirectory);

    const files = fs.readdirSync(exportDirectory).map(function(file) {
        return path.join(exportDirectory, file);
      });

    async.eachSeries(files, function (file, done) {
        log.info('export-file-sweeper: Checking export file ' + file);
        const stats = fs.lstatSync(file);
        //TODO delete file if older than some time
        log.info(stats.ctimeMs);
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