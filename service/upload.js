const multer = require('multer')
  , path = require('path')
  , crypto = require('crypto')
  , env = require('./environment/env');

const storage = multer.diskStorage({
  destination: env.tempDirectory,
  filename: function(req, file, cb) {
    crypto.pseudoRandomBytes(16, function(err, raw) {
      if (err) return cb(err);

      cb(null, raw.toString('hex') + path.extname(file.originalname));
    });
  }
});

function Upload(limits = {}) {
  return multer({
    storage: storage,
    limits: limits
  });
}

exports.Upload = Upload;
exports.default = Upload();
