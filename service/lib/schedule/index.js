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

const ExportTask = require('./export/export-task');
const env = require('../environment/env');
const exportResource = require('../models/export');

const exportTask = new ExportTask(
    {
        exportDirectory: env.exportDirectory,
        exportTtl: env.exportTtl
    },
    exportResource
);

function scheduleExportTask() {
    return __awaiter(this, void 0, void 0, function* () {
        yield exportTask.doTask();
        setTimeout(() => scheduleExportTask(), env.exportSweepInterval * 1000);
    });
}

exports.initialize = function () {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Initializing export-file-sweeper task');  // ✅ explicit log
        yield exportTask.initialize();
        scheduleExportTask();
    });
};
