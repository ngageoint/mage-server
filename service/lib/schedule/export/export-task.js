"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const log = require('../../logger'), fs = require('fs').promises, path = require('path');
class ExportTask {
    constructor({ exportDirectory, exportTtl }, exportResource) {
        this.exportDirectory = exportDirectory;
        this.exportTtl = exportTtl;
        this.exportResource = exportResource;
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            log.info(`export-file-sweeper: Initializing job to check ${this.exportDirectory} for expired export files every ${this.exportSweepInterval} seconds.`);
            log.debug('Creating export directory ' + this.exportDirectory);
            yield fs.mkdir(this.exportDirectory, { recursive: true });
            const exports = yield this.exportResource.getExports();
            for (const exp of exports) {
                if (exp.status === this.exportResource.ExportStatus.Running) {
                    log.info('Updating status of ' + exp.physicalPath + ' to failed');
                    exp.status = this.exportResource.ExportStatus.Failed;
                    yield this.exportResource.updateExport(exp);
                }
            }
            return Promise.resolve();
        });
    }
    doTask() {
        return __awaiter(this, void 0, void 0, function* () {
            log.info('export-file-sweeper: Sweeping directory ' + this.exportDirectory);
            try {
                const files = yield fs.readdir(this.exportDirectory);
                for (let i = 0; i < files.length; i++) {
                    try {
                        yield this.validateExportFile(path.join(this.exportDirectory, files[i]));
                    }
                    catch (err) {
                        log.error('Error validating export file', err);
                    }
                }
            }
            catch (err) {
                log.error('Cannot read export directory', err);
            }
        });
    }
    validateExportFile(file) {
        return __awaiter(this, void 0, void 0, function* () {
            const stats = yield fs.lstat(file);
            log.debug('export-file-sweeper: Checking export file ' + file);
            if (stats.birthtimeMs + (this.exportTtl * 1000) < Date.now()) {
                log.info('export-file-sweeper: ' + file + ' has expired, and will be deleted');
                yield fs.unlink(file);
                log.info('export-file-sweeper: Successfully removed ' + file);
            }
            else {
                log.debug('export-file-sweeper: ' + file + ' has not expired, and does not need to be deleted');
            }
        });
    }
}
module.exports = ExportTask;
