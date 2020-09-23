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

const ExportMetadataSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    physicalPath: { type: String },
    exportType: { type: String, required: true },
    status: { type: String, enum: [STATUS.Starting, STATUS.Running, STATUS.Completed, STATUS.Failed], default: STATUS.Starting },
    options: {
        eventId: { type: Number, ref: 'Event', required: true },
        filter: { type: Schema.Types.Mixed }
    }
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
        status: meta.status,
        options: {
            eventId: meta.options.eventId,
            filter: meta.options.filter
        }
    });
    return newMeta.save();
};