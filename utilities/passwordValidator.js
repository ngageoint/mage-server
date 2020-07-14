var Setting = require('../models/setting');

function validate(strategy, password) {
    return Setting.getSetting("security").then(securitySettings => {
        const passwordPolicy = securitySettings.settings[strategy].passwordPolicy;

        return Promise.resolve(true);
    });
}

module.exports = {
    validate
}