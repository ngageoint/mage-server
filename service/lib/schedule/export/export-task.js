"use strict";
const log = require('../../logger'); // fixed path for CI
const fs = require('fs').promises;
const path = require('path');

class ExportTask {
    constructor({ exportDirectory, exportTtl, exportSweepInterval = 60 }, exportResource) {
        this.exportDirectory = exportDirectory;
        this.exportTtl = exportTtl;
        this.exportSweepInterval = exportSweepInterval; // default 60 seconds
        this.exportResource = exportResource;
    }

    async initialize() {
        log.info(`export-file-sweeper: Initializing job to check ${this.exportDirectory} for expired export files every ${this.exportSweepInterval} seconds.`);
        log.debug('Creating export directory ' + this.exportDirectory);
        await fs.mkdir(this.exportDirectory, { recursive: true });

        // Update previously running exports to Failed
        const exports = await this.exportResource.getExports();
        for (const exp of exports) {
            if (exp.status === this.exportResource.ExportStatus.Running) {
                log.info('Updating status of ' + exp.physicalPath + ' to failed');
                exp.status = this.exportResource.ExportStatus.Failed;
                await this.exportResource.updateExport(exp);
            }
        }
    }

    async doTask() {
        log.info('export-file-sweeper: Sweeping directory ' + this.exportDirectory);
        try {
            const files = await fs.readdir(this.exportDirectory);
            for (const file of files) {
                try {
                    await this.validateExportFile(path.join(this.exportDirectory, file));
                } catch (err) {
                    log.error('Error validating export file', err);
                }
            }
        } catch (err) {
            log.error('Cannot read export directory', err);
        }
    }

    async validateExportFile(file) {
        const stats = await fs.lstat(file);
        log.debug('export-file-sweeper: Checking export file ' + file);
        if (stats.birthtimeMs + (this.exportTtl * 1000) < Date.now()) {
            log.info('export-file-sweeper: ' + file + ' has expired, and will be deleted');
            await fs.unlink(file);
            log.info('export-file-sweeper: Successfully removed ' + file);
        } else {
            log.debug('export-file-sweeper: ' + file + ' has not expired, and does not need to be deleted');
        }
    }
}

module.exports = ExportTask;

