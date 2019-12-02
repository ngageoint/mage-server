
import * as express from 'express'

exports.initialize = function initialize(app: express.Application, callback: (err?: Error | null) => void) {
    setImmediate(() => callback());
};


