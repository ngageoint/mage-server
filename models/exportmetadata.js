"use strict";

const mongoose = require('mongoose')
    , FilterParser = require('../utilities/filterParser');

// Creates a new Mongoose Schema object
const Schema = mongoose.Schema;

const exportStatusEnum = {
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
    status: {
        type: String,
        enum: [exportStatusEnum.Starting, exportStatusEnum.Running, exportStatusEnum.Completed, exportStatusEnum.Failed]
    },
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
exports.ExportStatus = exportStatusEnum;

exports.createMetadata = function (meta) {
    const newMeta = new ExportMetadata({
        userId: meta.userId,
        physicalPath: meta.physicalPath,
        exportType: meta.exportType,
        status: exportStatusEnum.Starting,
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

exports.getExportMetadatasByUserId = function (userId) {
    const conditions = {
        userId: userId
    };
    return ExportMetadata.find(conditions);
};

exports.getAllExportMetadatas = function () {
    const conditions = {
    };
    return ExportMetadata.find(conditions);
};

exports.count = function (options) {
    options = options || {};
    var filter = options.filter || {};

    const conditions = FilterParser.parse(filter);

    return ExportMetadata.count(conditions).exec();
};

exports.updateExportMetadataStatus = function (id, status) {
    return this.getExportMetadataById(id).then(update => {
        update.status = status;
        return update.save();
    });
};

exports.updateExportMetadata = function (meta) {
    return meta.save();
};