
'use strict';

const async = require('async')
    , log = require('winston')
    , fs = require('fs')
    , path = require('path')
    , exportDirectory = require('../../environment/env').exportDirectory;

function sweep() {
    log.info('export-file-sweeper: Sweeping directory ' + exportDirectory);

    const files = fs.readdirSync(exportDirectory).map(function (file) {
        return path.join(exportDirectory, file);
    });

    async.eachSeries(files, function (file, done) {
        log.debug('export-file-sweeper: Checking export file ' + file);
        const stats = fs.lstatSync(file);

        const now = new Date();
        if (stats.birthtimeMs + (72 * 60 * 60) < now.getMilliseconds()) {
            log.info('export-file-sweeper: ' + file + ' is too old, and will be deleted');

            fs.unlink(file, (err) => {
                if (err) { 
                    log.warn('export-file-sweeper: Failed to remove ' + file, err);
                    return done(err);
                }
                log.info('export-file-sweeper: Successfully removed ' + file);
            });
        } else {
            log.debug('export-file-sweeper: ' + file + ' has not expired, and does not need to be deleted');
        }
        done();
    }, function (err) {
        if (err) {
            log.error('export-file-sweeper: Error sweeping ' + exportDirectory, err);
        }
    });
}

exports.initialize = function (app, done) {
    log.info('export-file-sweeper: Initializing job to check ' + exportDirectory + ' for expired export files.');

    //TODO use config value for interval
    setInterval(sweep, 5000);

    done();
};