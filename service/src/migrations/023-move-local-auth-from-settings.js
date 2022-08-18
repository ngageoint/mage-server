const log = require('winston');

exports.id = 'move-local-auth-from-settings';

exports.up = async function (done) {
    log.info('Moving local authentication from settings to authenticationconfigurations');

    const settings = this.db.collection('settings');
    const result = await settings.findOneAndDelete({ type: 'security' })
    const localSettings = result.value.settings.local;

    let binIcon;
    if (localSettings.icon) {
        binIcon = Buffer.from(localSettings.icon, 'base64');
    }

    const authDbObject = {
        enabled: true,
        name: 'local',
        type: 'local',
        title: 'MAGE Username/Password',
        textColor: localSettings.textColor,
        buttonColor: localSettings.buttonColor,
        icon: binIcon,
        settings: {
            newUserEvents: [],
            newUserTeams: [],
            usersReqAdmin: {
                enabled: true
            },
            devicesReqAdmin: {
                enabled: true
            },
            accountLock: {
                enabled: false
            }
        }
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
    const authenticationconfigurations = await this.db.collection('authenticationconfigurations');
    await authenticationconfigurations.insertOne(authDbObject);
    done();
};

exports.down = function (done) {
    done();
};