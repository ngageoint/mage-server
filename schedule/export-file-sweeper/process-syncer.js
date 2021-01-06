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

async function sync() {
    log.info('Syncing processes with database');

    const metas = await ExportMetadata.getAllExportMetadatas();
    for (meta of metas) {
        if (meta.status == ExportMetadata.ExportStatus.Running) {
            log.info('Updating status of ' + meta.physicalPath + ' to failed');
            meta.status = ExportMetadata.ExportStatus.Failed;
            ExportMetadata.updateExportMetadata(meta);
        }
    }
}