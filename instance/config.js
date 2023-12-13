const path = require('path')

const baseDir = path.resolve(__dirname, '../scratch')

module.exports = {
  mage: {
    address: '127.0.0.1',
    port: 4242,
    attachmentDir: path.join(baseDir, 'attachments'),
    exportDir: path.join(baseDir, 'exports'),
    iconDir: path.join(baseDir, 'icons'),
    layerDir: path.join(baseDir, 'layers'),
    securityDir: path.join(baseDir, 'security'),
    tempDir: '/tmp',
    userDir: path.join(baseDir, 'users'),
    exportSweepInterval: 28800,
    exportTTL: 259200,
    tokenExpiration: 28800,
    mongo: {
      url: 'mongodb://127.0.0.1:27017/magedb',
      connTimeout: 300,
      connRetryDelay: 5,
      poolSize: 5,
      ssl: false,
      user: undefined,
      password: undefined,
      replicaSet: undefined,
      x509Key: undefined,
      x509KeyFile: undefined,
      x509Cert: undefined,
      x509CertFile: undefined,
    },
    plugins: {
      servicePlugins: [
        '@ngageoint/mage.arcgis',
        '@ngageoint/mage.image.service',
        '@ngageoint/mage.nga-msi',
        '@ngageoint/mage.random',
      ],
      webUIPlugins: [
        '@ngageoint/mage.arc-web'
      ],
    },
  }
}