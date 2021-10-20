const ExportTask = require('./export/export-task');
const env = require('../environment/env')
const exportResource = require('../models/export');

const exportTask = new ExportTask(env, exportResource);
async function scheduleExportTask() {
  await exportTask.doTask()
  setTimeout(() => scheduleExportTask(), env.exportSweepInterval * 1000);
}

exports.initialize = async function() {
  await exportTask.initialize();
  scheduleExportTask();
};