"use strict";

const mongoose = require('mongoose')
    , FilterParser = require('../utilities/filterParser')
    , log = require('winston');

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
    location: { type: String },
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
    return newMeta.save().then(savedMeta => {
        savedMeta.location = '/api/exports/' + savedMeta._id.toString();
        return savedMeta.save();
    });
};

exports.getExportMetadataById = function (id) {
    return ExportMetadata.findById(id).exec();
};

exports.getExportMetadatasByUserId = function (userId) {
    const conditions = {
        userId: userId
    };
    return ExportMetadata.find(conditions).populate('userId');
};

exports.getAllExportMetadatas = function () {
    const conditions = {
    };
    return ExportMetadata.find(conditions).populate('userId');
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
    }).catch(err => {
        log.warn(err);
        return Promise.reject(err);
    });
};

exports.updateExportMetadata = function (meta) {
    return meta.save();
};

exports.removeMetadata = function (id) {
    return ExportMetadata.remove({ _id: id }).exec();
};