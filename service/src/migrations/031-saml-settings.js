'use strict';

module.exports.id = "saml-settings";

const collectionName = 'authenticationconfigurations';
const optionKeys = [
  'entryPoint',
  'idpIssuer',
  'issuer',
  'logoutUrl',
  'requestIdExpirationPeriodMs',
];

module.exports.up = async function (done) {
  const authConfigsCol = this.db.collection(collectionName);
  const samlConfigs = await authConfigsCol.find({ type: 'saml' }).toArray();
  const updates = samlConfigs.reduce((updates, samlConfig) => {
    const settings = samlConfig.settings || {};
    const { options, ...cleanSettings } = settings;
    if (!options) {
      return updates;
    }
    const optionSettings = optionKeys.reduce((optionSettings, optionKey) => {
      const option = options[optionKey];
      const setting = cleanSettings[optionKey];
      if (option !== undefined && setting === undefined) {
        return { ...optionSettings, [optionKey]: option };
      }
      return optionSettings;
    }, null);
    if (!optionSettings) {
      return updates;
    }
    const updateSettings = { ...cleanSettings, ...optionSettings };
    return [
      ...updates,
      authConfigsCol
        .updateOne({ _id: samlConfig._id }, { $set: { settings: updateSettings }})
        .then(updateResult => ({ _id: samlConfig._id, name: samlConfig.name, settings: updateSettings, updateResult }))
    ]
  }, []);
  try {
    const updateResults = await Promise.all(updates);
    this.log(`migrated ${updateResults.length} saml configuration documents`);
    done();
  }
  catch (err) {
    this.log('error migrating saml configurations', err);
    done(err);
  }
};

module.exports.down = async function (done) {
  const col = this.db.collection(collectionName)
  const samlConfigs = await col.find({ type: 'saml' }).toArray()
  const updates = samlConfigs.reduce((updates, samlConfig) => {
    const settings = samlConfig.settings || {};
    const { entryPoint, issuer, ...cleanSettings } = settings;
    const options = { entryPoint, issuer };
    const updateSettings = { ...cleanSettings, options }
    return [
      ...updates,
      col.updateOne({ _id: samlConfig._id }, { $set: { settings: updateSettings }})
    ]
  }, []);
  try {
    const updateResults = await Promise.all(updates)
    this.log(`rolled back ${updateResults.length} saml configuration documents`)
    done()
  }
  catch (err) {
    this.log('error rolling back saml configurations', err)
    done(err);
  }
};