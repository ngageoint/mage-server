
const app = require('@ngageoint/mage.service/dist/app');
const environment = require('@ngageoint/mage.service/dist/environment');

app.on(MageReadyEvent, () => {
  app.listen(environment.port, environment.address, () => log.info(`MAGE Server: listening at address ${environment.address} on port ${environment.port}`));
});