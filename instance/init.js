#!/usr/bin/env node

const fs = require('fs')
const config = require('./config')

const mkdirp = dir => {
  fs.mkdirSync(dir, { recursive: true })
}

mkdirp(config.mage.attachmentDir)
mkdirp(config.mage.exportDir)
mkdirp(config.mage.iconDir)
mkdirp(config.mage.layerDir)
mkdirp(config.mage.securityDir)
mkdirp(config.mage.tempDir)
mkdirp(config.mage.userDir)
