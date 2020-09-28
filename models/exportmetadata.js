"use strict";

const mongoose = require('mongoose');

// Creates a new Mongoose Schema object
const Schema = mongoose.Schema;

const STATUS = {
    Starting: 'Starting',
    Running: 'Running',
    Completed: 'Completed',
    Failed: 'Failed'
};

const ErrorSchema = new Schema({
    type: { type: String, required: false },
    message: { type: String, required: true }
}, {
    versionKey: false,
    _id: false,
    timestamps: true
});

const ExportMetadataSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    physicalPath: { type: String },
    exportType: { type: String, required: true },
    status: { type: String, enum: [STATUS.Starting, STATUS.Running, STATUS.Completed, STATUS.Failed], default: STATUS.Starting },
    options: {
        eventId: { type: Number, ref: 'Event', required: true },
        filter: { type: Schema.Types.Mixed }
    },
    processingErrors: [ErrorSchema]
}, {
    versionKey: false,
    timestamps: {
        updatedAt: 'lastUpdated'
    }
});

const ExportMetadata = mongoose.model('ExportMetadata', ExportMetadataSchema);
exports.ExportModel = ExportMetadata;
exports.ExportStatus = STATUS;

exports.createMetadata = function (meta) {
    const newMeta = new ExportMetadata({
        userId: meta.userId,
        physicalPath: meta.physicalPath,
        exportType: meta.exportType,
        status: STATUS.Starting,
        options: {
            eventId: meta.options.eventId,
            filter: meta.options.filter
        }
    });
    return newMeta.save();
};

exports.getExportMetadataById = function (id) {
    return ExportMetadata.findById(id);
};

exports.updateExportMetadataStatus = function (id, status) {
    return this.getExportMetadataById(id).then(update => {
        update.status = status;
        return update.save();
    });
};