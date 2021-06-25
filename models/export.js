const mongoose = require('mongoose')
  , FilterParser = require('../utilities/filterParser')
  , environment = require('../environment/env');

// Export expiration in msecs
const exportExpiration = environment.exportTtl * 1000;

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

const ExportSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  relativePath: { type: String },
  filename: { type: String },
  exportType: { type: String, required: true },
  status: {
    type: String,
    enum: [exportStatusEnum.Starting, exportStatusEnum.Running, exportStatusEnum.Completed, exportStatusEnum.Failed]
  },
  options: {
    eventId: { type: Number, ref: 'Event', required: true },
    filter: { type: Schema.Types.Mixed }
  },
  processingErrors: [ErrorSchema],
  expirationDate: { type: Date, required: true }
}, {
  versionKey: false,
  timestamps: {
    updatedAt: 'lastUpdated'
  }
});

ExportSchema.index({ 'expirationDate':  1}, { expireAfterSeconds: 0 });

function transform(exportDocument, ret, options) {
  if ('function' !== typeof exportDocument.ownerDocument) {
    ret.id = ret._id;
    delete ret._id;

    const path = options.path ? options.path : "";
    ret.url = [path, ret.id].join("/");

    if (exportDocument.populated('options.eventId')) {
      ret.options.event = ret.options.eventId;
      delete ret.options.eventId;
    }
  }
}

ExportSchema.set('toJSON', {
  transform: transform
});

const Export = mongoose.model('Export', ExportSchema);
exports.ExportModel = Export;
exports.ExportStatus = exportStatusEnum;

exports.createExport = function (data) {
  const document = new Export({
    userId: data.userId,
    exportType: data.exportType,
    status: exportStatusEnum.Starting,
    options: {
      eventId: data.options.eventId,
      filter: data.options.filter
    },
    expirationDate: new Date(Date.now() + exportExpiration)
  });

  return Export.create(document);
};

exports.getExportById = function (id, options = {}) {
  let query = Export.findById(id);
  if (options.populate) {
    query = query.populate('userId').populate({ path: 'options.eventId', select: 'name' });
  }

  return query.exec()
};

exports.getExportsByUserId = function (userId, options = {}) {
  let query = Export.find({userId: userId});
  if (options.populate) {
    query = query.populate('userId').populate({ path: 'options.eventId', select: 'name' });
  }
  
  return query.exec();
};

exports.getExports = function (options = {}) {
  let query = Export.find({});
  if (options.populate) {
    query = query.populate('userId').populate({ path: 'options.eventId', select: 'name'});
  }

  return query.exec();
};

exports.count = function (options) {
  options = options || {};
  const filter = options.filter || {};

  const conditions = FilterParser.parse(filter);

  return Export.count(conditions).exec();
};

exports.updateExport = function (id, exp) {
  return Export.findByIdAndUpdate(id, exp, {new: true}).exec();

};

exports.removeExport = function (id) {
  return Export.findByIdAndRemove(id).exec();
};