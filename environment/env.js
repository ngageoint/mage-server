module.exports = process.env.CLOUDFOUNDRY ? require('cloudfoundry-environment') : require('local-environment');
