
import multer from 'multer'
import path from 'path'
import crypto from 'crypto'
import env from './environment/env'

const storage = multer.diskStorage({
  destination: env.tempDirectory,
  filename: function(req, file, cb: (error: Error | null, filename: string) => void): void {
    crypto.pseudoRandomBytes(16, function(err, raw) {
      if (err) {
        return cb(err, '')
      }
      cb(null, raw.toString('hex') + path.extname(file.originalname))
    })
  }
})

function UploadMiddleware(limits: multer.Options['limits'] = {}): multer.Multer {
  return multer({ storage, limits })
}

const defaultHandler = UploadMiddleware()
const upload = Object.freeze({ defaultHandler })

export = upload
