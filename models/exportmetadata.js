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
    path: { type: String },
    exportType: { type: String, required: true },
    status: { type: String, enum: [STATUS.Starting, STATUS.Running, STATUS.Completed, STATUS.Failed], required: true },
    options: {
        event: { type: String },
        users: { type: [String] },
        devices: { type: [String] },
        filter: { type: String }
    }
}, {
    versionKey: false,
    timestamps: {
        updatedAt: 'lastUpdated',
        createdAt: { type: Date, expires: '72h', default: Date.now }
    }
});

const ExportMetadata = mongoose.model('ExportMetadata', ExportMetadataSchema);
exports.ExportModel = ExportMetadata;
exports.ExportStatus = STATUS;