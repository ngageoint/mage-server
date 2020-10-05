
'use strict';

const async = require('async')
    , log = require('winston')
    , fs = require('fs')
    , path = require('path')
    , exportDirectory = require('../../environment/env').exportDirectory
    , exportTtl = require('../../environment/env').exportTtl
    , exportSweepInterval = require('../../environment/env').exportSweepInterval;

function sweep() {
    log.info('export-file-sweeper: Sweeping directory ' + exportDirectory);

    const files = fs.readdirSync(exportDirectory).map(function (file) {
        return path.join(exportDirectory, file);
    });

    async.eachSeries(files, function (file, done) {
        const stats = fs.lstatSync(file);
        log.debug('export-file-sweeper: Checking export file ' + file);

        if (stats.birthtimeMs + (exportTtl*1000) < Date.now()) {
            log.info('export-file-sweeper: ' + file + ' has expired, and will be deleted');

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
   
    const intervalMs = exportSweepInterval*1000;
    log.info('export-file-sweeper: Initializing job to check ' + exportDirectory + ' for expired export files every ' + intervalMs + 'ms');
    const firstSweep = new Date(Date.now() + intervalMs);
    log.info('export-file-sweeper: Will begin first sweep at ' + firstSweep.toString());
    setInterval(sweep, intervalMs);

    done();
};