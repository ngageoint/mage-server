const log = require('winston');

exports.id = 'move-local-auth-from-settings';

exports.up = function (done) {
    log.info('Moving local authentication from settings to authenticationconfigurations');

    const settings = this.db.collection('settings');
    settings.findOneAndDelete({ type: 'security' }).then(result => {
        const localSettings = result.value.settings.local;

        const authDbObject = {
            enabled: true,
            name: 'local',
            type: 'local',
            title: localSettings.title,
            textColor: localSettings.textColor,
            buttonColor: localSettings.buttonColor,
            icon: localSettings.icon,
            settings: {}
        };

        const nonSettingsKeys = ['name', 'type', 'title', 'textColor', 'buttonColor', 'icon'];
        const allKeys = Object.keys(localSettings);
        for (let i = 0; i < allKeys.length; i++) {
            const key = allKeys[i];
            if (nonSettingsKeys.includes(key)) {
                continue
            };
            authDbObject.settings[key] = localSettings[key];
        }
        log.debug('Strategy ' + 'local' + ' DB object:' + JSON.stringify(authDbObject));
        this.db.collection('authenticationconfigurations').insertOne(authDbObject, {}, done);
    }).catch(err => {
        done(err);
    });
};

exports.down = function (done) {
    done();
};