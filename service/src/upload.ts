
import multer from 'multer'
import path from 'path'
import crypto from 'crypto'
import env from './environment/env'

const storage = multer.diskStorage({
  destination: env.tempDirectory,
  filename: function(req, file, cb: any) {
    crypto.pseudoRandomBytes(16, function(err, raw) {
      if (err) {
        return cb(err);
      }
      cb(null, raw.toString('hex') + path.extname(file.originalname));
    });
  }
});

function Upload(limits: multer.Options['limits'] = {}) {
  return multer({
    storage, limits
  });
}

const defaultHandler = Upload()

const upload = {
  Upload, defaultHandler
}

export = upload
