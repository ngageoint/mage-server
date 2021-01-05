const log = require('../../logger')
    , environment = require('../../environment/env')
    , mongoose = require('mongoose')
    , ExportMetadata = require('../../models/exportmetadata');

module.exports = {
    sync: sync
};

const mongo = environment.mongo;
mongoose.connect(mongo.uri, mongo.options, function (err) {
    if (err) {
        log.error('Error connecting to mongo database, please make sure mongodb is running...');
        throw err;
    }
});

const mongooseLogger = log.loggers.get('mongoose');
mongoose.set('debug', function (collection, method, query, doc, options) {
    mongooseLogger.log('mongoose', "%s.%s(%j, %j, %j)", collection, method, query, doc, options);
});

function sync() {
    log.info('Syncing processes with database');

    return ExportMetadata.getAllExportMetadatas().then(metas => {
        for (meta of metas) {
            if (meta.status == ExportMetadata.ExportStatus.Running) {
                log.info('Updating status of ' + meta.physicalPath + ' to failed');
                meta.status = ExportMetadata.ExportStatus.Failed;
                ExportMetadata.updateExportMetadata(meta);
            }
        }
    });
}